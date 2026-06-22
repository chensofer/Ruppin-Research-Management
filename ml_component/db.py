import pandas as pd
import pyodbc

from config import get_connection_string


def get_connection():
    return pyodbc.connect(get_connection_string())


def load_payment_requests(conn=None) -> pd.DataFrame:
    own_conn = conn is None
    if own_conn:
        conn = get_connection()
    try:
        query = """
            SELECT
                pr.payment_request_id,
                pr.project_id,
                pr.requested_by_user_id,
                pr.provider_id,
                pr.category_name,
                pr.requested_amount,
                pr.request_date,
                pr.due_date,
                pr.status,
                pr.decision_date,
                p.total_budget,
                p.center_id,
                p.start_date    AS project_start_date,
                p.end_date      AS project_end_date,
                p.status        AS project_status
            FROM research_payment_requests pr
            LEFT JOIN research_projects p ON p.project_id = pr.project_id
        """
        return pd.read_sql(query, conn)
    finally:
        if own_conn:
            conn.close()


def load_projects(conn=None) -> pd.DataFrame:
    own_conn = conn is None
    if own_conn:
        conn = get_connection()
    try:
        query = """
            SELECT
                project_id,
                project_name_he,
                project_name_en,
                total_budget,
                center_id,
                start_date,
                end_date,
                status,
                research_expenses,
                is_archived
            FROM research_projects
        """
        return pd.read_sql(query, conn)
    finally:
        if own_conn:
            conn.close()


def load_all() -> dict:
    conn = get_connection()
    try:
        return {
            "payment_requests": load_payment_requests(conn),
            "projects": load_projects(conn),
        }
    finally:
        conn.close()


if __name__ == "__main__":
    data = load_all()
    for name, df in data.items():
        print(f"--- {name}: {df.shape[0]} rows x {df.shape[1]} cols ---")
        print(df.head())
        print()
