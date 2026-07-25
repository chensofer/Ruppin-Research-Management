# RupResearch — מערכת ניהול מחקרים ותקציבים

מערכת Full-Stack לניהול פרויקטי מחקר, תקציבים, בקשות תשלום ועוזרי מחקר — פותחה כפרויקט גמר על ידי מאי חכם, שחר ענפי וחן סופר, מכללת רופין, 2025–2026.

**גרסה חיה:** [https://proj.ruppin.ac.il/bgroup11/test1](https://proj.ruppin.ac.il/bgroup11/test1)

---

## תוכן עניינים

1. [תיאור המערכת](#תיאור-המערכת)
2. [טכנולוגיות](#טכנולוגיות)
3. [ארכיטקטורה ומסד הנתונים](#ארכיטקטורה-ומסד-הנתונים)
4. [תפקידי משתמשים](#תפקידי-משתמשים)
5. [פיצ'רים עיקריים](#פיצ'רים-עיקריים)
6. [הרכיב החכם — ML](#הרכיב-החכם--ml)
7. [התקנה והרצה](#התקנה-והרצה)
8. [קונפיגורציה](#קונפיגורציה)

---

## תיאור המערכת

RupResearch היא מערכת ניהול מחקרים מלאה המיועדת לארגוני מחקר אקדמיים.  
המערכת מאפשרת לחוקרים לנהל תקציבים, להגיש בקשות תשלום, לעקוב אחר הוצאות ולשתף עוזרי מחקר — כל זאת עם ממשק בעברית, RTL מלא, ותמיכה בייצוא דוחות ל-Excel ו-PDF.

---

## טכנולוגיות

### Frontend
| טכנולוגיה | גרסה | שימוש |
|-----------|------|-------|
| React | 18 | ממשק משתמש |
| Vite | 8 | Build tool |
| React Router | 6 | ניתוב |
| Axios | — | קריאות API |
| Tailwind CSS | 3 | עיצוב |
| ExcelJS | — | ייצוא Excel |
| Recharts | — | גרפים ותרשימים |
| React Hot Toast | — | הודעות Toast |

### Backend
| טכנולוגיה | גרסה | שימוש |
|-----------|------|-------|
| ASP.NET Core | .NET 8 | Web API |
| Entity Framework Core | 8 | גישה למסד נתונים |
| JWT Bearer | — | אימות משתמשים |
| BCrypt.Net | — | הצפנת סיסמאות |
| MailKit | — | שליחת מיילים |
| Swagger / OpenAPI | — | תיעוד API |

### רכיב חכם (ML)
| טכנולוגיה | שימוש |
|-----------|-------|
| Python 3.10+ | שפת הרכיב |
| scikit-learn | מודלים של ML |
| pandas / numpy | עיבוד נתונים |
| pyodbc | חיבור ל-SQL Server |

### שירותים חיצוניים
| שירות | שימוש |
|--------|-------|
| Google Gemini Flash | OCR — ניתוח מסמכים אוטומטי |
| Gmail SMTP | שליחת התראות מייל |
| SQL Server | מסד הנתונים |

---

## ארכיטקטורה ומסד הנתונים

```
frontend/          ← React + Vite (SPA)
├── src/
│   ├── pages/     ← דפי המערכת
│   ├── components/← קומפוננטים
│   ├── api/       ← קריאות ל-Backend
│   ├── context/   ← Auth state
│   └── utils/     ← עזר: ייצוא, קבצים, חגיגות

(root)/            ← ASP.NET Core Web API
├── Controllers/   ← HTTP בלבד, ללא לוגיקה עסקית
├── Services/      ← כל הלוגיקה העסקית
├── Models/        ← מודלי EF Core
└── DTOs/          ← אובייקטי בקשה/תגובה

ml_component/      ← Python ML
├── approval_classifier.py   ← מודול 1: Classification
├── expense_forecast.py      ← מודול 2: Regression
├── project_clustering.py    ← מודול 3: Clustering
├── budget_risk_classifier.py← מודול 4: Risk Classification
└── ml_insights.py           ← ממשק לשרת C#
```

### טבלאות מסד הנתונים (17 טבלאות)

```
research_users              research_projects
research_roles              research_centers
research_budget_categories  research_budget_plans
research_categories         research_center_budgets
research_payment_requests   research_providers
research_future_commitments research_assistants
research_hour_reports       research_monthly_work_approvals
research_files              research_users_projects
research_alerts
```

---

## תפקידי משתמשים

| תפקיד | הרשאות |
|-------|--------|
| **חוקר ראשי** | ניהול מחקר, הגשת בקשות תשלום, ניהול צוות, ייצוא דוחות |
| **עוזר מחקר** | דיווח שעות חודשי, צפייה בדוחות אישיים |
| **מזכירות** | אישור/דחיית בקשות, צפייה בכל המחקרים, השוואות, היסטוריה, ניהול משתמשים |

---

## פיצ'רים עיקריים

- **לוח בקרה (Dashboard)** — סקירה כללית של כל המחקרים, תקציבים, ניצול ויתרות
- **ניהול מחקר** — פרטים, צוות, עוזרים, תקציב לפי קטגוריות, מסמכים
- **בקשות תשלום** — הגשה, צירוף מסמכים, OCR אוטומטי לזיהוי פרטים מחשבוניות
- **אישורים ממתינים** — אישור/דחייה עם סיבה, תגיות AI לבקשות חשודות
- **הוצאות עתידיות** — ניהול התחייבויות עתידיות עם חיזוי תקציב
- **דיווח שעות** — עוזרי מחקר מדווחים שעות, מזכירות מאשרות
- **העברות תקציב** — המלצות חכמות להעברת תקציב בין מחקרים
- **השוואת מחקרים** — ניתוח השוואתי עם גרפים, קיבוץ ב-ML
- **ייצוא דוחות** — Excel עם Freeze + AutoFilter, PDF עם כותרות חוזרות
- **ארכיון** — מחקרים שהסתיימו
- **התראות** — ניצול תקציב, תאריכי סיום, בקשות ממתינות
- **ניהול משתמשים** — רק למזכירות

---

## הרכיב החכם — ML

הרכיב החכם כתוב ב-Python ומתחבר ישירות למסד הנתונים החי.  
השרת (C#) מריץ אותו כ-subprocess עם cache של 10 דקות.

| מודול | סוג | שאלה עסקית |
|-------|-----|------------|
| `approval_classifier.py` | Classification | האם בקשת תשלום תאושר? |
| `expense_forecast.py` | Regression | מה הסכום הצפוי לבקשה? |
| `project_clustering.py` | Clustering (K-Means) | אילו מחקרים דומים בדפוס הוצאותיהם? |
| `budget_risk_classifier.py` | Classification | האם אישור הבקשה יגרום לחריגת תקציב? |

התוצאות מוצגות ישירות בממשק: תגיות סיכון על בקשות ממתינות, קיבוצי מחקרים בדף ההשוואות, והמלצות להעברת תקציב.

---

## התקנה והרצה

### דרישות מוקדמות

- Node.js 18+
- .NET SDK 8.0
- Python 3.10+
- גישה ל-SQL Server של הפרויקט

---

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

הממשק יעלה על `http://localhost:5173`

לבנייה לייצור:
```bash
npm run build
```

---

### 2. Backend

```bash
# מהתיקייה הראשית
dotnet restore
dotnet run
```

השרת יעלה על `http://localhost:5269`  
Swagger זמין בכתובת: `http://localhost:5269/swagger`

> **חשוב:** יש ליצור קובץ `appsettings.Secrets.json` (ראו [קונפיגורציה](#קונפיגורציה)) לפני הרצה.

---

### 3. רכיב ML (Python)

```bash
cd ml_component

# התקנת ספריות
pip install -r requirements.txt

# הרצת כל המודלים
python main.py

# הרצת מודול בודד
python approval_classifier.py
python project_clustering.py
```

> **הערה לWindows:** אם יש בעיית קידוד בעברית ב-PowerShell, יש להריץ תחילה:
> ```powershell
> $env:PYTHONUTF8=1
> ```

גרפי הפלט נשמרים בתיקיית `ml_component/output/`

---

## קונפיגורציה

### Backend — `appsettings.Secrets.json`

יש ליצור קובץ זה בתיקייה הראשית (הוא מוחרג מ-git):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=<SERVER>;Initial Catalog=<DATABASE>;User ID=<USER>;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=True;"
  },
  "Gemini": {
    "ApiKey": "<YOUR_GEMINI_API_KEY>"
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUser": "<YOUR_EMAIL>",
    "SmtpPassword": "<YOUR_APP_PASSWORD>",
    "FromName": "RupResearch System",
    "SecretariatEmail": "<SECRETARIAT_EMAIL>",
    "SiteUrl": "<YOUR_SITE_URL>"
  },
  "Jwt": {
    "Key": "<MIN_32_CHAR_SECRET_KEY>",
    "Issuer": "RupResearchAPI",
    "Audience": "RupResearchClient"
  }
}
```

### ML — `ml_component/config.py`

```python
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=<SERVER>;"
    "DATABASE=<DATABASE>;"
    "UID=<USER>;"
    "PWD=<PASSWORD>;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)
```

> **Gemini API Key** — להשגת מפתח חינמי: [https://aistudio.google.com](https://aistudio.google.com)

---

## פותח על ידי

 מאי חכם, שחר ענפי וחן סופר — מכללת רופין, תוכנית מנהל עסקים ומערכות מידע, 2025–2026
