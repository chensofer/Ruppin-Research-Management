from __future__ import annotations

import numpy as np
import pandas as pd

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
