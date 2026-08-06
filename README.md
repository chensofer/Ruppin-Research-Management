<div align="center">

# RupResearch · מערכת ניהול מחקרים

**מערכת ניהול מחקרים ותקציבים חכמה למרכז האקדמי רופין — ניהול פרויקטים, תקציבים, בקשות תשלום וזיהוי חריגות אוטומטי באמצעות ML.**

מערכת Web מלאה עם עברית מלאה (RTL), ניהול הרשאות לפי תפקיד, ורכיב בינה מלאכותית לתמיכה בקבלת החלטות.

[![Live](https://img.shields.io/badge/Live-proj.ruppin.ac.il-blue)](https://proj.ruppin.ac.il/bgroup11/test1)
&nbsp;·&nbsp; ASP.NET Core 8 &nbsp;·&nbsp; React &nbsp;·&nbsp; SQL Server &nbsp;·&nbsp; ML (C#) &nbsp;·&nbsp; Google Gemini

</div>

---

## מה המערכת עושה

חוקר נכנס למערכת ורואה את כל מה שרלוונטי לניהול המחקר שלו במקום אחד:

- 📁 **ניהול מחקרים** — הקמה, עריכה, ארכיון ושחזור של מחקרים עם תקציב מחולק לפי קטגוריות הוצאה
- 💰 **תקציב ותנועות כספיות** — מעקב בזמן אמת אחר יתרות, תנועות מאושרות והתחייבויות עתידיות
- 📄 **בקשות תשלום** — הגשה עם צירוף מסמכים, חילוץ נתונים אוטומטי מחשבוניות (Gemini AI) ותהליך אישור/דחייה מול המזכירות
- 🧠 **רכיב ML חכם** — שלושה מודלי Random Forest וסיווג K-Means לחיזוי אישורים, זיהוי חריגות והערכת סיכון תקציבי
- 👥 **ניהול צוות ועוזרי מחקר** — ניהול חברי צוות ועוזרי מחקר כולל שכר שעתי ומעקב תשלומים
- ⏱️ **דיווח ואישור שעות** — דיווח שעות חודשי לעוזרי מחקר ואישור/דחייה מול החוקר האחראי
- 📊 **השוואת מחקרים** — ניתוח השוואתי עם גרפים, קיבוץ לפי דפוס הוצאות והמלצות להעברת תקציב
- 📬 **התראות ומיילים** — שליחת מיילים אוטומטיים על אישורים, דחיות ובקשות ממתינות
- 📤 **דוחות וייצוא** — הפקת דוחות מפורטים ב-Excel ו-PDF ברמת מחקר בודד או כלל המערכת

---

## ארכיטקטורה

```
┌──────────────────────────────────────────────────────────┐
│  frontend/  —  React + Vite SPA  ·  Tailwind CSS RTL     │
│  Context + Axios  ·  Recharts  ·  ExcelJS / PDF          │
└──────────────────────┬───────────────────────────────────┘
                       │  JSON over HTTPS · JWT Bearer
┌──────────────────────▼───────────────────────────────────┐
│  (root)/  —  ASP.NET Core 8 Web API                      │
│  Controllers → Services → Entity Framework Core          │
│  Auth · ML Insights · Gemini AI · MailKit                │
└──────┬───────────────────────────┬───────────────────────┘
       │                           │
┌──────▼──────────┐   ┌────────────▼──────────────┐
│  SQL Server     │   │  External Services         │
│  17 tables      │   │  Google Gemini API (OCR)   │
│  EF Core ORM    │   │  Gmail SMTP (MailKit)      │
└─────────────────┘   └───────────────────────────┘
```

| שכבה | נתיב | אחריות |
|------|------|--------|
| **Frontend** | `frontend/` | React SPA — דפים, קומפוננטים, API calls, ייצוא דוחות |
| **Backend** | `(root)/` | ASP.NET Core Web API — Controllers, Services, DTOs |
| **ML** | `ml_component/` | Python — אב-טיפוס האלגוריתמים (גרסת הייצור ב-C# בתוך Services) |

---

## Tech Stack

| תחום | טכנולוגיות |
|------|------------|
| **Frontend** | React · Vite · Tailwind CSS · React Router · Axios · Recharts · ExcelJS · React Hot Toast |
| **Backend** | ASP.NET Core 8 (C#) · Entity Framework Core · Swagger / OpenAPI |
| **Database** | SQL Server · 17 טבלאות |
| **Auth** | JWT Bearer · BCrypt · איפוס סיסמה במייל |
| **AI / ML** | Google Gemini (ניתוח מסמכים) · Random Forest + K-Means (מימוש C# מאפס) |
| **Email** | MailKit · Gmail SMTP |
| **Security** | JWT · BCrypt · Secrets מחוץ ל-git |

---

## תפקידי משתמשים

| תפקיד | הרשאות |
|-------|--------|
| **חוקר** | ניהול המחקרים שלו, הגשת בקשות תשלום, ניהול צוות, ייצוא דוחות |
| **מנהל מרכז מחקר** | כל הרשאות חוקר + צפייה במחקרי המרכז |
| **מזכירות** | אישור/דחיית בקשות, ניהול משתמשים, השוואות, היסטוריה |
| **עוזר מחקר** | דיווח שעות חודשי בלבד, צפייה בדוחות אישיים |

---

## הרכיב החכם — ML

הרכיב החכם פותח ב-Python עם Scikit-learn לצורך מחקר, בדיקה והערכת ביצועים, ולאחר מכן תורגם ל-C# ומשולב ישירות בשרת ללא תלויות חיצוניות.

| מודל | סוג | שאלה עסקית |
|------|-----|------------|
| Approval Classifier | Random Forest Classifier | האם בקשת תשלום תאושר? |
| Expense Forecast | Random Forest Regressor | מה הסכום הצפוי לבקשה? |
| Budget Risk | Random Forest Classifier | האם אישור הבקשה יגרום לחריגת תקציב? |
| Project Clustering | K-Means | אילו מחקרים דומים בדפוס הוצאותיהם? |

התוצאות מוצגות בממשק: תגיות סיכון על בקשות ממתינות, קיבוצי מחקרים בדף ההשוואות, והמלצות להעברת תקציב.

---

## דרישות מוקדמות

| כלי | גרסה |
|-----|------|
| Node.js | 18+ |
| .NET SDK | 8.0 |
| SQL Server | Express 2019+ |

---

## התקנה והרצה

```bash
git clone https://github.com/chensofer/Ruppin-Research-Management.git
cd Ruppin-Research-Management
```

**1. Backend** — צור קובץ `appsettings.Secrets.json` (ראו [קונפיגורציה](#קונפיגורציה)) ואז:

```bash
dotnet restore
dotnet run
```

השרת עולה על `http://localhost:5269` · Swagger: `http://localhost:5269/swagger`

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
```

הממשק עולה על `http://localhost:5173`

### סקריפטים שימושיים

| פקודה | פעולה |
|-------|--------|
| `dotnet run` | הרצת השרת לוקאלית |
| `npm run dev` | Vite dev server |
| `npm run build` | בניית production |

---

## קונפיגורציה

סודות **לעולם לא מועלים ל-git.** יש ליצור את הקובץ הבא בתיקייה הראשית:

### `appsettings.Secrets.json` (מוחרג מ-git)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=<SERVER>;Initial Catalog=<DB>;User ID=<USER>;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "<מינימום 32 תווים>",
    "Issuer": "RupResearchAPI",
    "Audience": "RupResearchClient"
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
  }
}
```

> **Gemini API Key** — להשגת מפתח חינמי: [https://aistudio.google.com](https://aistudio.google.com)

---

## מבנה הפרויקט

```
frontend/               React + Vite SPA
├── src/
│   ├── pages/          דפי המערכת
│   ├── components/     קומפוננטים משותפים
│   ├── api/            קריאות ל-Backend
│   ├── context/        Auth + Theme state
│   └── utils/          ייצוא דוחות, עזר

Controllers/            HTTP endpoints בלבד
Services/               לוגיקה עסקית + ML (C#)
Models/                 מודלי EF Core
DTOs/                   אובייקטי בקשה/תגובה
Data/                   DbContext

ml_component/           אב-טיפוס Python (מחקר בלבד)
├── approval_classifier.py
├── expense_forecast.py
├── budget_risk_classifier.py
└── project_clustering.py
```

---

## פותח על ידי

מאי חכם · חן סופר · שחר ענפי — המרכז האקדמי רופין, תוכנית מנהל עסקים ומערכות מידע, 2025–2026
