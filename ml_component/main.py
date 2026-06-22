import exploratory_analysis
import approval_classifier
import expense_forecast
import project_clustering
import budget_risk_classifier


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

    print("\nהרצה הושלמה בהצלחה. כל הגרפים נשמרו בתיקיית output/.")
