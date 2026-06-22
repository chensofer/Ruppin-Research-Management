from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import dendrogram, linkage
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from data_prep import build_payment_requests_dataset
from db import get_connection, load_payment_requests
from plot_utils import he

OUTPUT_DIR = "output"


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


def run_kmeans(X_scaled, k_range=range(2, 6)):
    inertias = []
    for k in k_range:
        km = KMeans(n_clusters=k, n_init=10, random_state=42)
        km.fit(X_scaled)
        inertias.append(km.inertia_)
    return list(k_range), inertias


def plot_elbow(k_values, inertias, output_dir=OUTPUT_DIR):
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(k_values, inertias, "o-")
    ax.set_xlabel(he("מספר קבוצות (K)"))
    ax.set_ylabel("Cost Function (Inertia)")
    ax.set_title(he("Elbow Method - בחירת K עבור K-Means"))
    fig.tight_layout()
    fig.savefig(f"{output_dir}/clustering_elbow.png", dpi=150)
    plt.close(fig)


def plot_clusters_pca(X_scaled, labels, title, filename, output_dir=OUTPUT_DIR):
    pca = PCA(n_components=2)
    coords = pca.fit_transform(X_scaled)

    fig, ax = plt.subplots(figsize=(6, 5))
    scatter = ax.scatter(coords[:, 0], coords[:, 1], c=labels, cmap="tab10", s=80)
    ax.set_xlabel("PCA 1")
    ax.set_ylabel("PCA 2")
    ax.set_title(he(title))
    legend1 = ax.legend(*scatter.legend_elements(), title=he("קבוצה"))
    ax.add_artist(legend1)
    fig.tight_layout()
    fig.savefig(f"{output_dir}/{filename}", dpi=150)
    plt.close(fig)


def plot_dendrogram(X_scaled, labels, output_dir=OUTPUT_DIR):
    fig, ax = plt.subplots(figsize=(10, 5))
    Z = linkage(X_scaled, method="average")
    dendrogram(Z, labels=labels, ax=ax)
    ax.set_title(he("Dendrogram - Hierarchical Clustering (Average Linkage)"))
    ax.set_xlabel(he("פרויקט (project_id)"))
    ax.set_ylabel(he("מרחק"))
    fig.tight_layout()
    fig.savefig(f"{output_dir}/clustering_dendrogram.png", dpi=150)
    plt.close(fig)


def run():
    conn = get_connection()
    raw = load_payment_requests(conn)
    conn.close()

    df = build_payment_requests_dataset(raw)
    features = build_project_features(df)

    feature_cols = [
        "total_budget", "num_requests", "total_requested", "avg_request_amount",
        "num_categories", "num_outliers", "total_approved", "approval_rate",
        "budget_utilization",
    ]
    X = features[feature_cols]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k_values, inertias = run_kmeans(X_scaled)
    plot_elbow(k_values, inertias)

    chosen_k = 3
    kmeans = KMeans(n_clusters=chosen_k, n_init=10, random_state=42)
    features["kmeans_cluster"] = kmeans.fit_predict(X_scaled)

    plot_clusters_pca(
        X_scaled, features["kmeans_cluster"],
        f"K-Means (K={chosen_k}) - פילוח פרויקטים", "clustering_kmeans_pca.png",
    )

    print(f"\n===== K-Means (K={chosen_k}) =====")
    summary = features.groupby("kmeans_cluster")[feature_cols].mean().round(2)
    print(summary.to_string())
    print("\nפרויקטים בכל קבוצה:")
    print(features.groupby("kmeans_cluster")["project_id"].apply(list).to_string())

    project_labels = features["project_id"].astype(str).tolist()
    plot_dendrogram(X_scaled, project_labels)

    agg = AgglomerativeClustering(n_clusters=chosen_k, linkage="average")
    features["hierarchical_cluster"] = agg.fit_predict(X_scaled)

    plot_clusters_pca(
        X_scaled, features["hierarchical_cluster"],
        f"Hierarchical Clustering (K={chosen_k}) - פילוח פרויקטים",
        "clustering_hierarchical_pca.png",
    )

    print(f"\n===== Hierarchical Clustering (K={chosen_k}) =====")
    print(features.groupby("hierarchical_cluster")["project_id"].apply(list).to_string())

    print(f"\nהגרפים נשמרו בתיקיית '{OUTPUT_DIR}/'.")
    return features


if __name__ == "__main__":
    run()
