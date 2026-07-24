from __future__ import annotations

import numpy as np
import pandas as pd


def build_project_features(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("project_id")

    features = grouped.agg(
        total_budget=("total_budget", "first"),
        num_requests=("payment_request_id", "count"),
        total_requested=("requested_amount", "sum"),
        avg_request_amount=("requested_amount", "mean"),
        num_categories=("category_name", "nunique"),
        num_outliers=("is_amount_outlier", "sum"),
    )

    approved = df[df["approved_label"] == 1].groupby("project_id")["requested_amount"].sum()
    features["total_approved"] = approved.reindex(features.index).fillna(0)

    decided = df[df["approved_label"].notna()].groupby("project_id")["approved_label"]
    features["approval_rate"] = decided.mean().reindex(features.index).fillna(1.0)

    features["budget_utilization"] = (
        features["total_approved"] / features["total_budget"].replace(0, np.nan)
    ).fillna(0)

    features = features.reset_index()
    return features
