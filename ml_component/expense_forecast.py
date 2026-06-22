from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from data_prep import build_payment_requests_dataset, encode_categoricals
from db import get_connection, load_payment_requests
from plot_utils import he

OUTPUT_DIR = "output"

NUMERIC_FEATURES = [
    "total_budget",
    "amount_to_budget_ratio",
    "days_to_due",
    "has_due_date",
    "request_month",
    "request_day_of_week",
    "project_progress_at_request",
]


def prepare_regression_data(df: pd.DataFrame):
    df = df.copy()

    encoded = encode_categoricals(df, ["category_name"])
    category_cols = [c for c in encoded.columns if c.startswith("category_name_")]

    feature_cols = [c for c in NUMERIC_FEATURES if c != "amount_to_budget_ratio"] + category_cols
    X = encoded[feature_cols]

    y_log = np.log1p(encoded["requested_amount"])

    return X, y_log, encoded["requested_amount"], feature_cols


def evaluate_regressor(name, model, X_train, X_test, y_train_log, y_test_log):
    model.fit(X_train, y_train_log)
    pred_log = model.predict(X_test)

    y_test_amount = np.expm1(y_test_log)
    pred_amount = np.expm1(pred_log)

    mae = mean_absolute_error(y_test_amount, pred_amount)
    mse = mean_squared_error(y_test_amount, pred_amount)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test_log, pred_log)

    print(f"\n===== {name} =====")
    print(f"MAE  (ש\"ח) : {mae:,.1f}")
    print(f"MSE  (ש\"ח^2): {mse:,.1f}")
    print(f"RMSE (ש\"ח) : {rmse:,.1f}")
    print(f"R^2 (log scale): {r2:.3f}")

    return {
        "name": name,
        "model": model,
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "y_test_amount": y_test_amount,
        "pred_amount": pred_amount,
    }


def plot_results(results, feature_cols, output_dir=OUTPUT_DIR):
    fig, axes = plt.subplots(1, len(results), figsize=(6 * len(results), 5))
    for ax, res in zip(axes, results):
        ax.scatter(res["y_test_amount"], res["pred_amount"], alpha=0.6)
        max_val = max(res["y_test_amount"].max(), res["pred_amount"].max())
        ax.plot([0, max_val], [0, max_val], "r--", label=he("חיזוי מושלם"))
        ax.set_xlabel(he("סכום אמיתי (ש\"ח)"))
        ax.set_ylabel(he("סכום חזוי (ש\"ח)"))
        ax.set_title(res["name"])
        ax.legend()
    fig.suptitle(he("תחזית סכום בקשת תשלום - חזוי מול אמיתי"))
    fig.tight_layout()
    fig.savefig(f"{output_dir}/expense_forecast_predicted_vs_actual.png", dpi=150)
    plt.close(fig)

    rf_res = next((r for r in results if r["name"] == "Random Forest Regressor"), None)
    if rf_res is not None:
        importances = pd.Series(rf_res["model"].feature_importances_, index=feature_cols)
        importances = importances.sort_values(ascending=True).tail(10)
        fig, ax = plt.subplots(figsize=(7, 5))
        importances.plot(kind="barh", ax=ax)
        ax.set_title(he("10 התכונות המשפיעות ביותר על סכום הבקשה (Random Forest)"))
        ax.set_yticklabels([he(t.get_text()) for t in ax.get_yticklabels()])
        fig.tight_layout()
        fig.savefig(f"{output_dir}/expense_forecast_feature_importance.png", dpi=150)
        plt.close(fig)


def run():
    conn = get_connection()
    raw = load_payment_requests(conn)
    conn.close()

    df = build_payment_requests_dataset(raw)
    X, y_log, y_amount, feature_cols = prepare_regression_data(df)

    print(f"\nסה\"כ דוגמאות: {len(X)}")

    X_train, X_test, y_train_log, y_test_log = train_test_split(
        X, y_log, test_size=0.3, random_state=42
    )

    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=200, max_depth=5, random_state=42),
    }

    results = [
        evaluate_regressor(name, model, X_train, X_test, y_train_log, y_test_log)
        for name, model in models.items()
    ]

    plot_results(results, feature_cols)
    print(f"\nהגרפים נשמרו בתיקיית '{OUTPUT_DIR}/'.")

    return results


if __name__ == "__main__":
    run()
