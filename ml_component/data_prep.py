from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

APPROVED_STATUSES = ["אושר", "שולם"]
REJECTED_STATUSES = ["נדחה"]
PENDING_STATUSES = ["ממתין"]

UNKNOWN_CATEGORY = "לא ידוע"


def clean_payment_requests(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    before = len(df)
    df = df.drop_duplicates(subset=["payment_request_id"])

    df = df.dropna(subset=["requested_amount"])

    df["category_name"] = df["category_name"].fillna(UNKNOWN_CATEGORY)

    df = df[df["requested_amount"] > 0]

    after = len(df)
    print(f"[Cleaning] payment_requests: {before} -> {after} שורות "
          f"(הוסרו {before - after} שורות עם ערכים חסרים/לא תקינים)")

    return df.reset_index(drop=True)


def detect_amount_outliers(df: pd.DataFrame, column: str = "requested_amount") -> pd.DataFrame:
    df = df.copy()
    q1 = df[column].quantile(0.25)
    q3 = df[column].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    df["is_amount_outlier"] = (df[column] < lower) | (df[column] > upper)

    n_outliers = df["is_amount_outlier"].sum()
    print(f"[QC] נמצאו {n_outliers} בקשות תשלום חריגות (IQR: "
          f"[{lower:,.0f}, {upper:,.0f}] ש\"ח) מתוך {len(df)}")

    return df


def map_dates(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["request_date"] = pd.to_datetime(df["request_date"])
    df["project_start_date"] = pd.to_datetime(df["project_start_date"])
    df["project_end_date"] = pd.to_datetime(df["project_end_date"])
    df["due_date"] = pd.to_datetime(df["due_date"])

    df["request_month"] = df["request_date"].dt.month
    df["request_day_of_week"] = df["request_date"].dt.dayofweek
    df["request_is_weekend"] = df["request_day_of_week"].isin([4, 5]).astype(int)

    df["has_due_date"] = df["due_date"].notna().astype(int)
    days_to_due = (df["due_date"] - df["request_date"]).dt.days
    df["days_to_due"] = days_to_due.fillna(days_to_due.median())

    project_duration = (df["project_end_date"] - df["project_start_date"]).dt.days.replace(0, 1)
    elapsed = (df["request_date"] - df["project_start_date"]).dt.days
    df["project_progress_at_request"] = (elapsed / project_duration).clip(0, 2)

    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["amount_to_budget_ratio"] = df["requested_amount"] / df["total_budget"].replace(0, np.nan)
    df["amount_to_budget_ratio"] = df["amount_to_budget_ratio"].fillna(0)

    df["log_amount"] = np.log1p(df["requested_amount"])

    df["amount_bin"] = pd.qcut(
        df["requested_amount"], q=3, labels=["נמוך", "בינוני", "גבוה"], duplicates="drop"
    )

    return df


def encode_categoricals(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    return pd.get_dummies(df, columns=columns, prefix=columns)


def scale_numeric(df: pd.DataFrame, columns: list[str]) -> tuple[pd.DataFrame, StandardScaler]:
    df = df.copy()
    scaler = StandardScaler()
    df[columns] = scaler.fit_transform(df[columns])
    return df, scaler


def build_payment_requests_dataset(raw_df: pd.DataFrame) -> pd.DataFrame:
    df = clean_payment_requests(raw_df)
    df = detect_amount_outliers(df)
    df = map_dates(df)
    df = engineer_features(df)

    df["approved_label"] = np.where(
        df["status"].isin(APPROVED_STATUSES), 1,
        np.where(df["status"].isin(REJECTED_STATUSES), 0, np.nan)
    )

    return df


if __name__ == "__main__":
    from db import load_payment_requests, get_connection

    conn = get_connection()
    raw = load_payment_requests(conn)
    conn.close()

    prepared = build_payment_requests_dataset(raw)
    print(prepared[["payment_request_id", "category_name", "requested_amount",
                     "log_amount", "amount_bin", "status", "approved_label",
                     "days_to_due", "project_progress_at_request"]].head(10).to_string())
