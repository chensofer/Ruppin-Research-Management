from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from data_prep import build_payment_requests_dataset
from db import get_connection, load_payment_requests
from plot_utils import he

OUTPUT_DIR = "output"

plt.rcParams["axes.unicode_minus"] = False


def run():
    conn = get_connection()
    raw = load_payment_requests(conn)
    conn.close()

    df = build_payment_requests_dataset(raw)

    freq = df["category_name"].value_counts()
    rel_freq = (freq / len(df) * 100).round(1)
    freq_table = pd.DataFrame({"Frequency": freq, "Relative Frequency (%)": rel_freq})
    print("\n===== טבלת שכיחות - קטגוריות =====")
    print(freq_table.to_string())

    status_freq = df["status"].value_counts()
    print("\n===== טבלת שכיחות - סטטוסים =====")
    print(status_freq.to_string())

    desc = df["requested_amount"].describe()
    print("\n===== סטטיסטיקה תיאורית - סכומי בקשות (requested_amount) =====")
    print(desc.to_string())
    print(f"IQR: {desc['75%'] - desc['25%']:.2f}")

    fig, ax = plt.subplots(figsize=(8, 5))
    freq.plot(kind="bar", ax=ax)
    ax.set_title(he("Bar Chart - מספר בקשות תשלום לפי קטגוריה"))
    ax.set_xlabel(he("קטגוריה"))
    ax.set_ylabel(he("מספר בקשות"))
    ax.set_xticklabels([he(str(t)) for t in freq.index], rotation=45, ha="right")
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/eda_category_bar_chart.png", dpi=150)
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].hist(df["requested_amount"], bins=20, color="steelblue", edgecolor="black")
    axes[0].set_title(he("Histogram - סכום בקשה (ש\"ח)"))
    axes[0].set_xlabel(he("סכום (ש\"ח)"))
    axes[0].set_ylabel(he("שכיחות"))

    axes[1].hist(df["log_amount"], bins=20, color="seagreen", edgecolor="black")
    axes[1].set_title(he("Histogram - log(סכום+1)"))
    axes[1].set_xlabel("log(amount+1)")
    fig.suptitle(he("התפלגות סכומי בקשות תשלום - לפני ואחרי Log Transformation"))
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/eda_amount_histogram.png", dpi=150)
    plt.close(fig)

    top_categories = freq.head(6).index
    subset = df[df["category_name"].isin(top_categories)]
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.boxplot(data=subset, x="category_name", y="requested_amount", ax=ax)
    ax.set_title(he("Box Plot - סכום בקשת תשלום לפי קטגוריה (6 הקטגוריות הנפוצות)"))
    ax.set_xlabel(he("קטגוריה"))
    ax.set_ylabel(he("סכום (ש\"ח)"))
    ax.set_xticklabels([he(t.get_text()) for t in ax.get_xticklabels()], rotation=45, ha="right")
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/eda_amount_boxplot.png", dpi=150)
    plt.close(fig)

    numeric_cols = [
        "requested_amount", "log_amount", "total_budget", "amount_to_budget_ratio",
        "days_to_due", "project_progress_at_request", "request_month",
    ]
    corr = df[numeric_cols].corr()
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax)
    ax.set_title(he("Heatmap - קורלציות בין משתנים נומריים"))
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/eda_correlation_heatmap.png", dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 6))
    status_freq.index = [he(str(i)) for i in status_freq.index]
    status_freq.plot(kind="pie", autopct="%1.1f%%", ax=ax)
    ax.set_title(he("Pie Chart - התפלגות סטטוסי בקשות תשלום"))
    ax.set_ylabel("")
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/eda_status_pie_chart.png", dpi=150)
    plt.close(fig)

    print(f"\nהגרפים נשמרו בתיקיית '{OUTPUT_DIR}/'.")


if __name__ == "__main__":
    run()
