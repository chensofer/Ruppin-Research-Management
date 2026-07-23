from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from approval_classifier import NUMERIC_FEATURES as APPROVAL_NUMERIC_FEATURES
from budget_risk_classifier import NUMERIC_FEATURES, build_risk_label
from data_prep import build_payment_requests_dataset, encode_categoricals
from db import get_connection, load_payment_requests, load_projects
from expense_forecast import NUMERIC_FEATURES as FORECAST_NUMERIC_FEATURES
from project_clustering import build_project_features

log = lambda *a: print(*a, file=sys.stderr)


def train_risk_model(df: pd.DataFrame):
    encoded = encode_categoricals(df, ["category_name"])
    category_cols = [c for c in encoded.columns if c.startswith("category_name_")]
    feature_cols = NUMERIC_FEATURES + category_cols

    X = encoded[feature_cols].copy()
    scaler = StandardScaler()
    X[NUMERIC_FEATURES] = scaler.fit_transform(X[NUMERIC_FEATURES])
    y = encoded["budget_risk_label"]

    model = RandomForestClassifier(n_estimators=200, max_depth=5, random_state=42, class_weight="balanced")
    model.fit(X, y)
    return model, scaler, feature_cols, category_cols


def predict_current_risk(model, scaler, feature_cols, category_cols, df, projects_df):
    now = pd.Timestamp(datetime.now(timezone.utc).date())
    median_days_to_due = df["days_to_due"].median()

    requests_count = df.groupby("project_id")["payment_request_id"].count()

    rows = []
    project_ids = []
    for _, proj in projects_df.iterrows():
        pid = proj["project_id"]
        start = pd.to_datetime(proj["start_date"])
        end = pd.to_datetime(proj["end_date"])
        duration = (end - start).days if pd.notna(start) and pd.notna(end) and (end - start).days != 0 else 1
        elapsed = (now - start).days if pd.notna(start) else 0
        progress = float(np.clip(elapsed / duration, 0, 2)) if duration else 0.0

        row = {col: 0 for col in feature_cols}
        row["log_amount"] = float(df["log_amount"].mean())
        row["total_budget"] = float(proj["total_budget"] or 0)
        row["days_to_due"] = float(median_days_to_due)
        row["has_due_date"] = 0
        row["request_month"] = now.month
        row["project_progress_at_request"] = progress
        row["requests_so_far"] = int(requests_count.get(pid, 0)) + 1

        rows.append(row)
        project_ids.append(pid)

    X = pd.DataFrame(rows, columns=feature_cols)
    X[NUMERIC_FEATURES] = scaler.transform(X[NUMERIC_FEATURES])

    proba = model.predict_proba(X)[:, 1]
    return dict(zip(project_ids, proba))


def label_cluster(avg_utilization: float, n_clusters_sorted: list[float]) -> str:
    rank = n_clusters_sorted.index(avg_utilization)
    if rank == 0:
        return "פרופיל חסכוני"
    if rank == len(n_clusters_sorted) - 1:
        return "פרופיל בסיכון - שריפת תקציב מהירה"
    return "פרופיל תקין"


AMOUNT_FLAG_THRESHOLD = 1.5


def compute_pending_request_insights(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["is_amount_outlier"] = df["is_amount_outlier"].astype(int)

    encoded = encode_categoricals(df, ["category_name"])
    category_cols = [c for c in encoded.columns if c.startswith("category_name_")]

    pending_mask = encoded["approved_label"].isna()
    labeled_mask = ~pending_mask

    if not pending_mask.any() or not labeled_mask.any():
        return {}

    approval_feature_cols = APPROVAL_NUMERIC_FEATURES + category_cols
    X_approval = encoded[approval_feature_cols].astype(float).copy()
    scaler_approval = StandardScaler()
    X_approval.loc[labeled_mask, APPROVAL_NUMERIC_FEATURES] = scaler_approval.fit_transform(
        X_approval.loc[labeled_mask, APPROVAL_NUMERIC_FEATURES]
    )
    X_approval.loc[pending_mask, APPROVAL_NUMERIC_FEATURES] = scaler_approval.transform(
        X_approval.loc[pending_mask, APPROVAL_NUMERIC_FEATURES]
    )

    y_approval = encoded.loc[labeled_mask, "approved_label"].astype(int)
    approval_model = RandomForestClassifier(
        n_estimators=200, max_depth=5, random_state=42, class_weight="balanced"
    )
    approval_model.fit(X_approval.loc[labeled_mask, approval_feature_cols], y_approval)
    approval_proba = approval_model.predict_proba(X_approval.loc[pending_mask, approval_feature_cols])[:, 1]

    forecast_feature_cols = [c for c in FORECAST_NUMERIC_FEATURES if c != "amount_to_budget_ratio"] + category_cols
    X_forecast = encoded[forecast_feature_cols]
    y_forecast = np.log1p(encoded["requested_amount"])

    forecast_model = RandomForestRegressor(n_estimators=200, max_depth=5, random_state=42)
    forecast_model.fit(X_forecast, y_forecast)
    expected_amount = np.expm1(forecast_model.predict(X_forecast.loc[pending_mask]))

    pending_ids = encoded.loc[pending_mask, "payment_request_id"].astype(int).tolist()
    actual_amounts = encoded.loc[pending_mask, "requested_amount"].tolist()

    approved_rows = df.loc[df["approved_label"] == 1]
    approved_means = {
        "amount_to_budget_ratio": float(approved_rows["amount_to_budget_ratio"].mean()),
        "days_to_due": float(approved_rows["days_to_due"].mean()),
        "project_progress_at_request": float(approved_rows["project_progress_at_request"].mean()),
    }
    pending_rows = df.loc[pending_mask]

    out = {}
    for pid, proba, exp_amount, actual, (_, row) in zip(
        pending_ids, approval_proba, expected_amount, actual_amounts, pending_rows.iterrows()
    ):
        ratio = float(actual / exp_amount) if exp_amount > 0 else 1.0
        amount_flag = ratio >= AMOUNT_FLAG_THRESHOLD

        reasons = []
        if amount_flag:
            reasons.append(
                f"הסכום המבוקש (₪{actual:,.0f}) גבוה בכ-{ratio:.1f} פעמים מהסכום הצפוי "
                f"לבקשה מסוג זה (₪{exp_amount:,.0f}), בהתבסס על בקשות דומות מהעבר."
            )
        if proba < 0.5:
            if bool(row["is_amount_outlier"]):
                reasons.append("הסכום המבוקש הוא חריג סטטיסטי (Outlier) בהשוואה לכל בקשות התשלום במערכת.")
            if row["amount_to_budget_ratio"] > approved_means["amount_to_budget_ratio"] * 1.5:
                reasons.append("הבקשה מהווה אחוז גבוה מהתקציב הכולל של הפרויקט, בהשוואה לבקשות שאושרו בעבר.")
            if row["days_to_due"] < approved_means["days_to_due"] * 0.5:
                reasons.append("מועד היעד לתשלום קרוב משמעותית מהרגיל, בהשוואה לבקשות שאושרו בעבר.")
            if row["project_progress_at_request"] > approved_means["project_progress_at_request"] + 0.3:
                reasons.append("הבקשה מוגשת בשלב מתקדם יותר בציר הזמן של הפרויקט, בהשוואה לבקשות שאושרו בעבר.")
            if not reasons:
                reasons.append("מאפייני הבקשה (סכום, מועד הגשה, קטגוריה) דומים לבקשות שנדחו בעבר במערכת.")

        out[str(pid)] = {
            "approval_probability": round(float(proba), 4),
            "approval_label": "צפי לאישור" if proba >= 0.5 else "מומלץ לבדוק בקפידה",
            "expected_amount": round(float(exp_amount), 2),
            "amount_ratio": round(ratio, 2),
            "amount_flag": amount_flag,
            "reasons": reasons,
        }

    return out


def run() -> dict:
    conn = get_connection()
    raw = load_payment_requests(conn)
    projects_df = load_projects(conn)
    conn.close()

    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        df = build_payment_requests_dataset(raw)
    finally:
        sys.stdout = real_stdout
    df_risk = build_risk_label(df)

    model, scaler, feature_cols, category_cols = train_risk_model(df_risk)
    risk_scores = predict_current_risk(model, scaler, feature_cols, category_cols, df_risk, projects_df)

    features = build_project_features(df)
    feature_cols_cluster = [
        "total_budget", "num_requests", "total_requested", "avg_request_amount",
        "num_categories", "num_outliers", "total_approved", "approval_rate",
        "budget_utilization",
    ]
    X_cluster = features[feature_cols_cluster]
    scaler_cluster = StandardScaler()
    X_scaled = scaler_cluster.fit_transform(X_cluster)

    n_clusters = min(3, len(features))
    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    features["cluster"] = kmeans.fit_predict(X_scaled)

    cluster_utilization = features.groupby("cluster")["budget_utilization"].mean()
    sorted_utilization = sorted(cluster_utilization.tolist())
    cluster_labels = {
        c: label_cluster(util, sorted_utilization) for c, util in cluster_utilization.items()
    }

    projects_out = {}
    for _, row in features.iterrows():
        pid = int(row["project_id"])
        cluster = int(row["cluster"])
        score = float(risk_scores.get(pid, 0.0))
        projects_out[str(pid)] = {
            "risk_score": round(score, 4),
            "risk_label": "בסיכון" if score >= 0.5 else "תקין",
            "cluster": cluster,
            "cluster_label": cluster_labels[cluster],
            "budget_utilization": round(float(row["budget_utilization"]), 4),
        }

    clusters_out = {
        str(c): {
            "label": cluster_labels[c],
            "avg_budget_utilization": round(float(util), 4),
            "project_ids": [int(p) for p in features.loc[features["cluster"] == c, "project_id"]],
        }
        for c, util in cluster_utilization.items()
    }

    pending_out = compute_pending_request_insights(df_risk)

    return {"projects": projects_out, "clusters": clusters_out, "pending_requests": pending_out}


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, ensure_ascii=False))
