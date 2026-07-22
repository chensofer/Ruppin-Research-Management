"""
transfer_recommendations.py
===========================
אלגוריתם המלצות להעברת תקציב בין מחקרים.

הלוגיקה מחולקת לשלושה שלבים:
  1. העשרת נתוני המחקרים — חישוב שדות נגזרים (usagePct, burnRate, daysLeft, riskScore)
  2. זיהוי "מקורות" (givers) ו"יעדים" (receivers) לפי סף יתרה + ציון ML
  3. Greedy matching — שיוך מקור ליעד, חישוב סכום, וניקוד ה"התאמה"
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# קבועים
# ─────────────────────────────────────────────────────────────────────────────

TODAY: date = date.today()

MIN_TRANSFER_AMOUNT   = 2_000   # העברה מינימלית (₪)
MIN_AVAIL_RATIO       = 0.15    # יחס מינימלי של יתרה מהתקציב כדי להיות מקור
MIN_AVAIL_ABSOLUTE    = 5_000   # יתרה מינימלית אבסולוטית (₪) כדי להיות מקור
MAX_GIVER_RISK        = 0.30    # ציון סיכון ML מקסימלי למקור
MIN_RECEIVER_RISK     = 0.50    # ציון סיכון ML מינימלי ליעד
ENDING_SOON_DAYS      = 45      # מחקר שמסתיים תוך כ"כ ימים נחשב "קרוב לסיום"
TRANSFER_RATIO        = 0.35    # מקסימום כ"כ מהיתרה ניתן להעביר
BUFFER_RATIO_DEFICIT  = 0.05    # חיץ נוסף מעל הגירעון
BUFFER_RATIO_NORMAL   = 0.12    # צורך מוערך כשאין גירעון


# ─────────────────────────────────────────────────────────────────────────────
# פונקציות עזר — חישובי זמן
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(val) -> Optional[date]:
    """המרת string/datetime/date לאובייקט date. מחזיר None אם אי אפשר."""
    if val is None:
        return None
    if isinstance(val, date):
        return val if not isinstance(val, datetime) else val.date()
    s = str(val).strip()[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def calc_time_pct(project: dict) -> Optional[float]:
    """
    אחוז הזמן שעבר מתוך תקופת המחקר (0–100).
    מקביל ל-calcTimePct בגרסת JavaScript.
    """
    start = _parse_date(project.get("startDate") or project.get("start_date"))
    end   = _parse_date(project.get("endDate")   or project.get("end_date"))
    if not start or not end or end <= start:
        return None
    total_days   = (end - start).days
    elapsed_days = (TODAY - start).days
    return max(0.0, min(100.0, round(elapsed_days / total_days * 100, 1)))


def calc_days_left(project: dict) -> Optional[int]:
    """
    כמה ימים נותרו עד סיום המחקר (>= 0).
    מקביל ל-calcDaysLeft בגרסת JavaScript.
    """
    end = _parse_date(project.get("endDate") or project.get("end_date"))
    if end is None:
        return None
    return max(0, (end - TODAY).days)


# ─────────────────────────────────────────────────────────────────────────────
# העשרת פרויקט
# ─────────────────────────────────────────────────────────────────────────────

def enrich_project(project: dict, ml_insights: dict) -> dict:
    """
    מוסיף שדות מחושבים לפרויקט:
      budget, paid, avail, usagePct, burnRate, timePct, daysLeft,
      riskScore, isGiver, isReceiver.
    """
    p = dict(project)

    budget   = float(p.get("totalBudget")         or p.get("total_budget")       or 0)
    paid     = float(p.get("totalPaid")            or p.get("total_paid")         or 0)
    avail    = float(p.get("availableBalance")     or p.get("available_balance")  or 0)
    time_pct = calc_time_pct(p)
    usage_pct = (paid / budget * 100) if budget > 0 else 0.0
    burn_rate = (usage_pct / time_pct) if (time_pct and time_pct > 0) else None
    days_left = calc_days_left(p)

    pid = str(p.get("projectId") or p.get("project_id") or "")
    insight    = ml_insights.get(pid) or ml_insights.get(pid.lstrip("0")) or {}
    risk_score: Optional[float] = insight.get("risk_score")

    ending_soon = days_left is not None and days_left <= ENDING_SOON_DAYS

    # ── קריטריונים להיות מקור ──────────────────────────────────────────────
    # יש יתרה מספקת (מוחלטת ויחסית) + ציון ML נמוך (בריא)
    is_giver = (
        avail > max(budget * MIN_AVAIL_RATIO, MIN_AVAIL_ABSOLUTE)
        and (risk_score is None or risk_score < MAX_GIVER_RISK)
        and (not ending_soon or avail > budget * 0.30)
    )

    # ── קריטריונים להיות יעד ───────────────────────────────────────────────
    # גירעון ממשי, או ציון ML גבוה (צפוי לחרוג)
    is_receiver = (
        avail < 0
        or (risk_score is not None and risk_score >= MIN_RECEIVER_RISK)
    )

    p.update({
        "budget":     budget,
        "paid":       paid,
        "avail":      avail,
        "usagePct":   round(usage_pct, 1),
        "burnRate":   round(burn_rate, 2) if burn_rate is not None else None,
        "timePct":    time_pct,
        "daysLeft":   days_left,
        "riskScore":  risk_score,
        "isGiver":    is_giver,
        "isReceiver": is_receiver,
    })
    return p


# ─────────────────────────────────────────────────────────────────────────────
# ניקוד התאמה — calcConfidence
# ─────────────────────────────────────────────────────────────────────────────

def calc_confidence(giver: dict, receiver: dict) -> int:
    """
    ניקוד ה"ביטחון" בהמלצה (0–100%).
    משקלל יתרת מקור, ציון ML של שני הצדדים, וזמן שנותר.
    מקביל ל-calcConfidence בגרסת JavaScript.
    """
    score = 0
    max_score = 0

    # ── מקור: גודל היתרה ──────────────────────────────────────────────────
    max_score += 2
    if giver["avail"] > (giver["budget"] or 0) * 0.25:
        score += 2
    elif giver["avail"] > (giver["budget"] or 0) * MIN_AVAIL_RATIO:
        score += 1

    # ── מקור: ציון ML ─────────────────────────────────────────────────────
    if giver["riskScore"] is not None:
        max_score += 2
        if giver["riskScore"] < 0.15:
            score += 2
        elif giver["riskScore"] < MAX_GIVER_RISK:
            score += 1

    # ── מקור: ימים שנותרו ─────────────────────────────────────────────────
    if giver["daysLeft"] is not None:
        max_score += 2
        if giver["daysLeft"] > 90:
            score += 2
        elif giver["daysLeft"] > ENDING_SOON_DAYS:
            score += 1

    # ── יעד: דחיפות הצורך ─────────────────────────────────────────────────
    max_score += 3
    if receiver["avail"] < 0:
        score += 3
    elif receiver["riskScore"] is not None and receiver["riskScore"] > 0.75:
        score += 2
    else:
        score += 1

    return round(score / max_score * 100) if max_score > 0 else 0


# ─────────────────────────────────────────────────────────────────────────────
# Greedy matching — buildTransferRecommendations
# ─────────────────────────────────────────────────────────────────────────────

def build_transfer_recommendations(
    projects: list[dict],
    ml_insights: dict | None = None,
) -> list[dict]:
    """
    אלגוריתם Greedy Matching להמלצות העברת תקציב.

    שלבים:
      1. העשרת כל המחקרים בשדות מחושבים + ציוני ML
      2. מיון מקורות (urgency > avail), מיון יעדים (risk_score ↓)
      3. עבור כל יעד — מצא את המקור הטוב ביותר הזמין, חשב סכום, הוסף המלצה

    מחזיר רשימת המלצות, כל אחת עם:
      giver, receiver, amount, confidence, tags
    """
    insights: dict = (ml_insights or {}).get("projects") or {}

    enriched = [enrich_project(p, insights) for p in projects]

    # ── מקורות: ממוינים לפי דחיפות (קרוב לסיום קודם), אחר כך לפי יתרה ──
    givers = sorted(
        [p for p in enriched if p["isGiver"]],
        key=lambda p: (
            0 if (p["daysLeft"] is not None and p["daysLeft"] <= ENDING_SOON_DAYS) else 1,
            -p["avail"],
        ),
    )

    # ── יעדים: ממוינים לפי ציון סיכון ML יורד ─────────────────────────────
    receivers = sorted(
        [p for p in enriched if p["isReceiver"]],
        key=lambda p: -(p["riskScore"] or 0),
    )

    # עוקב אחר היתרה הנותרת לכל מקור אחרי שיוכים קודמים
    giver_remaining: dict = {
        g.get("projectId") or g.get("project_id"): g["avail"] for g in givers
    }

    recommendations: list[dict] = []

    for recv in receivers:
        recv_id = recv.get("projectId") or recv.get("project_id")

        # מקור עם יתרה מספקת שעדיין לא התרוקן
        giver = next(
            (
                g for g in givers
                if (g.get("projectId") or g.get("project_id")) != recv_id
                and giver_remaining.get(g.get("projectId") or g.get("project_id"), 0)
                   > max(g["budget"] * MIN_AVAIL_RATIO, MIN_AVAIL_ABSOLUTE)
            ),
            None,
        )
        if giver is None:
            break

        giver_id = giver.get("projectId") or giver.get("project_id")
        remaining = giver_remaining[giver_id]

        # חישוב סכום ההעברה מתוך היתרה הנותרת
        need = (
            abs(recv["avail"]) + recv["budget"] * BUFFER_RATIO_DEFICIT
            if recv["avail"] < 0
            else recv["budget"] * BUFFER_RATIO_NORMAL
        )
        amount = min(remaining * TRANSFER_RATIO, need)

        if amount < MIN_TRANSFER_AMOUNT:
            continue

        giver_remaining[giver_id] -= amount

        # בניית תגיות הסבר
        tags: list[str] = []
        if giver["riskScore"] is not None:
            tags.append(
                f"ציון סיכון תקציבי נמוך ({round(giver['riskScore'] * 100)}%) — מודל ML"
            )
        if giver["daysLeft"] is not None and giver["daysLeft"] <= ENDING_SOON_DAYS:
            tags.append(f"המחקר מסתיים בעוד {giver['daysLeft']} ימים — יתרה עודפת")
        elif giver["daysLeft"] is not None:
            tags.append(f"{giver['daysLeft']} ימים נותרו למקור")
        if recv["avail"] < 0:
            tags.append(f"גירעון ₪{abs(recv['avail']):,.0f}")
        if recv["riskScore"] is not None and recv["riskScore"] >= MIN_RECEIVER_RISK:
            tags.append(
                f"ציון סיכון תקציבי גבוה ({round(recv['riskScore'] * 100)}%) — מודל ML"
            )

        recommendations.append({
            "giver":      giver,
            "receiver":   recv,
            "amount":     round(amount, 2),
            "confidence": calc_confidence(giver, recv),
            "tags":       tags,
        })

    return recommendations


# ─────────────────────────────────────────────────────────────────────────────
# הרצה עצמאית (דמו)
# ─────────────────────────────────────────────────────────────────────────────

def run(projects: list[dict], ml_insights: dict | None = None) -> list[dict]:
    recs = build_transfer_recommendations(projects, ml_insights)

    print(f"\n{'='*65}", file=sys.stderr)
    print("5. המלצות להעברת תקציב (Greedy Matching + ML Risk Score)", file=sys.stderr)
    print(f"{'='*65}", file=sys.stderr)
    print(f"נמצאו {len(recs)} המלצות להעברת תקציב:", file=sys.stderr)

    for i, rec in enumerate(recs, 1):
        g_name = rec["giver"].get("projectNameHe") or rec["giver"].get("project_name_he") or f"מחקר #{rec['giver'].get('projectId')}"
        r_name = rec["receiver"].get("projectNameHe") or rec["receiver"].get("project_name_he") or f"מחקר #{rec['receiver'].get('projectId')}"
        print(
            f"  {i}. {g_name} → {r_name} | "
            f"₪{rec['amount']:,.0f} | ביטחון: {rec['confidence']}%",
            file=sys.stderr,
        )
        for tag in rec["tags"]:
            print(f"       • {tag}", file=sys.stderr)

    return recs


if __name__ == "__main__":
    # ── דמו עם נתונים לדוגמה ────────────────────────────────────────────────
    sample_projects = [
        {
            "projectId": 1, "projectNameHe": "מחקר ביולוגיה",
            "totalBudget": 200_000, "totalPaid": 30_000, "availableBalance": 170_000,
            "startDate": "2024-01-01", "endDate": "2024-12-31",
        },
        {
            "projectId": 2, "projectNameHe": "מחקר כימיה",
            "totalBudget": 100_000, "totalPaid": 105_000, "availableBalance": -5_000,
            "startDate": "2024-01-01", "endDate": "2025-06-30",
        },
        {
            "projectId": 3, "projectNameHe": "מחקר פיזיקה",
            "totalBudget": 80_000, "totalPaid": 70_000, "availableBalance": 10_000,
            "startDate": "2023-06-01", "endDate": "2024-12-15",
        },
    ]
    sample_insights = {
        "projects": {
            "1": {"risk_score": 0.08, "risk_label": "תקין"},
            "2": {"risk_score": 0.72, "risk_label": "בסיכון"},
            "3": {"risk_score": 0.61, "risk_label": "בסיכון"},
        }
    }
    result = run(sample_projects, sample_insights)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
