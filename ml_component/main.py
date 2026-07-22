import exploratory_analysis
import approval_classifier
import expense_forecast
import project_clustering
import budget_risk_classifier
import transfer_recommendations
from db import get_connection, load_projects


def section(title: str):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


if __name__ == "__main__":
    section("0. ניתוח חוקר וויזואליזציה (EDA)")
    exploratory_analysis.run()

    section("1. חיזוי אישור / דחיית בקשת תשלום (Classification)")
    approval_classifier.run()

    section("2. תחזית סכום בקשת תשלום עתידית (Regression)")
    expense_forecast.run()

    section("3. פילוח פרויקטים לפי דפוס הוצאות (Clustering)")
    project_clustering.run()

    section("4. חיזוי סיכון חריגת תקציב (Classification)")
    budget_risk_classifier.run()

    section("5. המלצות להעברת תקציב (Greedy Matching + ML Risk Score)")
    conn = get_connection()
    projects_df = load_projects(conn)
    conn.close()
    projects_list = projects_df.rename(columns={
        "project_id":      "projectId",
        "project_name_he": "projectNameHe",
        "total_budget":    "totalBudget",
        "start_date":      "startDate",
        "end_date":        "endDate",
    }).to_dict(orient="records")
    transfer_recommendations.run(projects_list)

    print("\nהרצה הושלמה בהצלחה. כל הגרפים נשמרו בתיקיית output/.")
