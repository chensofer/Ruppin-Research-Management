from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from data_prep import build_payment_requests_dataset, encode_categoricals
from db import get_connection, load_payment_requests
from plot_utils import he

OUTPUT_DIR = "output"
RISK_THRESHOLD = 1.2

NUMERIC_FEATURES = [
    "log_amount",
    "total_budget",
    "days_to_due",
    "has_due_date",
    "request_month",
    "project_progress_at_request",
    "requests_so_far",
]


def build_risk_label(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["project_id", "request_date"]).copy()

    df["approved_amount"] = np.where(df["approved_label"] == 1, df["requested_amount"], 0)

    cum_approved = df.groupby("project_id")["approved_amount"].cumsum()
    cum_with_current = cum_approved + np.where(
        df["approved_label"].isna(), df["requested_amount"], 0
    )

    df["spend_ratio_if_approved"] = cum_with_current / df["total_budget"].replace(0, np.nan)
    df["time_ratio"] = df["project_progress_at_request"].clip(lower=0.01)

    df["requests_so_far"] = df.groupby("project_id").cumcount() + 1

    df["budget_risk_label"] = (
        df["spend_ratio_if_approved"] > df["time_ratio"] * RISK_THRESHOLD
    ).astype(int)

    return df


def prepare_risk_data(df: pd.DataFrame):
    encoded = encode_categoricals(df, ["category_name"])
    category_cols = [c for c in encoded.columns if c.startswith("category_name_")]

    feature_cols = NUMERIC_FEATURES + category_cols
    X = encoded[feature_cols].copy()

    scaler = StandardScaler()
    X[NUMERIC_FEATURES] = scaler.fit_transform(X[NUMERIC_FEATURES])

    y = encoded["budget_risk_label"]
    return X, y, feature_cols


def evaluate_model(name, model, X_train, X_test, y_train, y_test, X, y):
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_test, y_proba)
    except ValueError:
        auc = float("nan")

    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")

    print(f"\n===== {name} =====")
    print(f"Accuracy  : {acc:.3f}")
    print(f"Precision : {prec:.3f}")
    print(f"Recall    : {rec:.3f}")
    print(f"F1 Score  : {f1:.3f}")
    print(f"AUC       : {auc:.3f}")
    print(f"Cross-Validation Accuracy (5-fold): {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    return {
        "name": name, "model": model, "accuracy": acc, "precision": prec,
        "recall": rec, "f1": f1, "auc": auc, "cv_mean": cv_scores.mean(),
        "y_test": y_test, "y_pred": y_pred,
    }


def plot_results(results, feature_cols, output_dir=OUTPUT_DIR):
    fig, axes = plt.subplots(1, len(results), figsize=(5 * len(results), 4))
    for ax, res in zip(axes, results):
        cm = confusion_matrix(res["y_test"], res["y_pred"])
        ConfusionMatrixDisplay(cm, display_labels=[he("תקין"), he("סיכון")]).plot(ax=ax, colorbar=False)
        ax.set_title(res["name"])
    fig.suptitle(he("Confusion Matrix - חיזוי סיכון חריגת תקציב"))
    fig.tight_layout()
    fig.savefig(f"{output_dir}/budget_risk_confusion_matrices.png", dpi=150)
    plt.close(fig)

    rf_res = next((r for r in results if r["name"] == "Random Forest"), None)
    if rf_res is not None:
        importances = pd.Series(rf_res["model"].feature_importances_, index=feature_cols)
        importances = importances.sort_values(ascending=True).tail(10)
        fig, ax = plt.subplots(figsize=(7, 5))
        importances.plot(kind="barh", ax=ax)
        ax.set_title(he("10 התכונות המשפיעות ביותר על סיכון חריגת תקציב (Random Forest)"))
        ax.set_yticklabels([he(t.get_text()) for t in ax.get_yticklabels()])
        fig.tight_layout()
        fig.savefig(f"{output_dir}/budget_risk_feature_importance.png", dpi=150)
        plt.close(fig)


def run():
    conn = get_connection()
    raw = load_payment_requests(conn)
    conn.close()

    df = build_payment_requests_dataset(raw)
    df = build_risk_label(df)

    print(f"\nהתפלגות תווית הסיכון: \n{df['budget_risk_label'].value_counts().to_string()}")

    X, y, feature_cols = prepare_risk_data(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
        "Decision Tree": DecisionTreeClassifier(max_depth=4, random_state=42, class_weight="balanced"),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, max_depth=5, random_state=42, class_weight="balanced"
        ),
    }

    results = [
        evaluate_model(name, model, X_train, X_test, y_train, y_test, X, y)
        for name, model in models.items()
    ]

    plot_results(results, feature_cols)
    print(f"\nהגרפים נשמרו בתיקיית '{OUTPUT_DIR}/'.")

    return results


if __name__ == "__main__":
    run()
