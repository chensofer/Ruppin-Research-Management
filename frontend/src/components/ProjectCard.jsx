import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TODAY = new Date().toISOString().split('T')[0];

function getIsActive(project) {
  if (!project.endDate) return true;
  return String(project.endDate).slice(0, 10) >= TODAY;
}

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

// ── Performance Score Algorithm ───────────────────────────────────────────────
// Score starts at 100. Deductions:
//   1A. Pending payment requests: -3 each, max -15
//   1B. Pending hour approvals:   -2 each, max -10
//   Total approvals cap: -25
//   2.  Time-vs-budget gap: 0 / -10 / -20 / -30
//   3.  Special end/early-stage conditions: -10 or -15

function getTimeMetrics(project) {
  const startStr = project.startDate ? String(project.startDate).slice(0, 10) : null;
  const endStr   = project.endDate   ? String(project.endDate).slice(0, 10)   : null;
  if (!startStr || !endStr || endStr <= startStr) return null;
  const total   = new Date(endStr) - new Date(startStr);
  const elapsed = new Date(TODAY)  - new Date(startStr);
  const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  return { timeElapsedPct: Math.round(pct), raw: pct };
}

function calcPerformanceScore(project) {
  const budget      = project.totalBudget || 0;
  const paid        = project.totalPaid ?? 0;
  const pending     = project.pendingCount ?? 0;
  const hourPending = project.pendingHourApprovalsCount ?? 0;

  const timeMetrics  = getTimeMetrics(project);
  const timeProgress = timeMetrics?.raw ?? 0;
  const budgetUsage  = budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;

  // 1A: Pending payment requests (-3 each, max -15)
  const paymentDeduction = Math.min(pending * 3, 15);

  // 1B: Pending hour approvals (-2 each, max -10)
  const hourDeduction = Math.min(hourPending * 2, 10);

  // Total approvals section capped at -25
  const approvalsDeduction = Math.min(paymentDeduction + hourDeduction, 25);

  // 2: Time-vs-budget gap deduction (max -30)
  let gapDeduction = 0;
  if (budget > 0 && timeMetrics) {
    const gap = Math.abs(timeProgress - budgetUsage);
    if      (gap > 30) gapDeduction = 30;
    else if (gap > 20) gapDeduction = 20;
    else if (gap > 10) gapDeduction = 10;
  }

  // 3: Special conditions
  let specialDeduction = 0;
  if (budget > 0 && timeMetrics) {
    if (timeProgress >= 70 && budgetUsage < 60) specialDeduction += 10;
    if (timeProgress >= 70 && budgetUsage > 90) specialDeduction += 15;
    if (timeProgress <= 30 && budgetUsage > 50) specialDeduction += 10;
  }

  const score = 100 - approvalsDeduction - gapDeduction - specialDeduction;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getPerformanceLabel(score) {
  if (score >= 80) return { label: 'ביצועים מצוינים',  color: '#5CB800', bg: '#f0fae0', ring: '#5CB800' };
  if (score >= 60) return { label: 'דורש תשומת לב',    color: '#f59e0b', bg: '#fffbeb', ring: '#f59e0b' };
  return               { label: 'סיכון תקציבי גבוה',  color: '#ef4444', bg: '#fef2f2', ring: '#ef4444' };
}

function buildPerformanceExplanation(project) {
  const budget      = project.totalBudget || 0;
  const paid        = project.totalPaid ?? 0;
  const pending     = project.pendingCount ?? 0;
  const hourPending = project.pendingHourApprovalsCount ?? 0;

  const timeMetrics      = getTimeMetrics(project);
  const timeProgress     = timeMetrics?.raw ?? 0;
  const timeProgressDisp = timeMetrics?.timeElapsedPct ?? 0;
  const budgetUsageRaw   = budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;
  const budgetUsageDisp  = Math.round(budgetUsageRaw);

  const reasons      = [];
  const improvements = [];

  // 1A: Pending payment requests
  const paymentDeduction = Math.min(pending * 3, 15);
  if (pending === 0) {
    reasons.push('✅ אין בקשות תשלום ממתינות לאישור');
  } else {
    reasons.push(`⚠️ ${pending} בקשות תשלום ממתינות לאישור: -${paymentDeduction} נקודות`);
    improvements.push('סקור ואשר את בקשות התשלום הממתינות');
    improvements.push('עיכוב באישורים עלול לפגוע בפעילות המחקר');
  }

  // 1B: Pending hour approvals
  const hourDeduction = Math.min(hourPending * 2, 10);
  if (hourPending === 0) {
    reasons.push('✅ אין דוחות שעות ממתינים לאישור');
  } else {
    reasons.push(`⚠️ ${hourPending} דוחות שעות ממתינים לאישור: -${hourDeduction} נקודות`);
    improvements.push('סקור את דוחות שעות עוזרי המחקר הממתינים לאישור');
    improvements.push('עיכוב באישורים עלול לעכב את עיבוד המשכורות');
  }

  // 2 & 3: Timeline vs budget (only when budget and dates are available)
  if (budget > 0 && timeMetrics) {
    const gap     = Math.abs(timeProgress - budgetUsageRaw);
    const gapDisp = Math.round(gap);
    let gapDeduction = 0;
    if      (gap > 30) gapDeduction = 30;
    else if (gap > 20) gapDeduction = 20;
    else if (gap > 10) gapDeduction = 10;

    if (gapDeduction === 0) {
      reasons.push(`✅ קצב ניצול תקציב תקין — ${budgetUsageDisp}% נוצל, ${timeProgressDisp}% מהזמן עבר`);
    } else {
      reasons.push(`⚠️ פער בין התקדמות הזמן לניצול התקציב (${timeProgressDisp}% זמן, ${budgetUsageDisp}% תקציב, פער ${gapDisp}%): -${gapDeduction} נקודות`);
    }

    // Special case 1: near end, too much budget unused
    if (timeProgress >= 70 && budgetUsageRaw < 60) {
      reasons.push(`🔴 הפרויקט קרוב לסיומו אך חלק גדול מהתקציב טרם נוצל: -10 נקודות`);
      improvements.push('בחן את הצרכים הנותרים ואת תכנית ההוצאות עד סיום המחקר');
      improvements.push('אם רלוונטי ומותר — שקול העברת תקציב למחקר אחר');
      improvements.push('בדוק האם הוצאות מתוכננות עוכבו או נשמטו');
    }

    // Special case 2: near end, budget nearly exhausted
    if (timeProgress >= 70 && budgetUsageRaw > 90) {
      reasons.push(`🔴 הפרויקט קרוב לסיומו וכמעט כל התקציב מוצה: -15 נקודות`);
      improvements.push('בחן בזהירות את ההוצאות הצפויות הנותרות');
      improvements.push('הימנע מאישור תשלומים שאינם הכרחיים');
      improvements.push('שקול בקשת התאמת תקציב אם רלוונטי');
    }

    // Special case 3: early stage, spending too fast
    if (timeProgress <= 30 && budgetUsageRaw > 50) {
      reasons.push(`🔴 ניצול תקציב גבוה בשלב מוקדם של הפרויקט: -10 נקודות`);
      improvements.push('בחן את ההוצאות האחרונות והצפויות לשאר הפרויקט');
      improvements.push('ודא שקצב ההוצאות ברי-קיימא עד סיום המחקר');
    }
  } else if (!timeMetrics) {
    reasons.push('ℹ️ לא הוגדרו תאריכי התחלה/סיום — לא ניתן לחשב קצב ניצול תקציב');
  } else {
    reasons.push('ℹ️ לא הוגדר תקציב — לא ניתן לחשב קצב ניצול');
  }

  return { reasons, improvements };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UsageBar({ percent }) {
  const color =
    percent >= 90 ? '#ef4444' :
    percent >= 70 ? '#f59e0b' :
    '#5CB800';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
          {percent}%
        </span>
        <span className="text-[11px] text-gray-400">ניצול תקציב</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function PerformanceBadge({ score, project }) {
  const [open, setOpen] = useState(false);
  const { label, color, bg, ring } = getPerformanceLabel(score);
  const { reasons, improvements } = buildPerformanceExplanation(project);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: bg, borderColor: ring + '40' }}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-right"
      >
        {/* Score circle */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={color} strokeWidth="3"
              strokeDasharray={`${(score / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold" style={{ color }}>
            {score}
          </span>
        </div>

        {/* Label */}
        <div className="text-right flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 leading-none mb-0.5">מדד ביצועים</p>
          <p className="text-xs font-bold leading-none" style={{ color }}>{label}</p>
        </div>

        {/* Chevron */}
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
          style={{ color, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable explanation */}
      {open && (
        <div
          className="px-3 pb-3 space-y-2 border-t text-right"
          style={{ borderColor: ring + '30' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reasons */}
          <div className="pt-2 space-y-1">
            {reasons.map((r, i) => (
              <p key={i} className="text-[11px] text-gray-600 leading-snug">{r}</p>
            ))}
          </div>

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="pt-1 border-t" style={{ borderColor: ring + '30' }}>
              <p className="text-[10px] font-bold text-gray-500 mb-1">💡 המלצות לשיפור:</p>
              {improvements.map((tip, i) => (
                <p key={i} className="text-[11px] text-gray-600 leading-snug">{tip}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectCard({ project }) {
  const navigate  = useNavigate();
  const isActive  = getIsActive(project);

  const budget    = project.totalBudget || 0;
  const totalPaid = project.totalPaid ?? 0;
  const remaining = project.remainingBalance ?? (budget - totalPaid);
  const available = project.availableBalance ?? remaining;
  const usagePct  = budget > 0 ? Math.min(Math.round((totalPaid / budget) * 100), 100) : 0;

  const balanceNegative = remaining < 0;
  const healthScore     = isActive ? calcPerformanceScore(project) : null;

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Status stripe */}
      <div
        className="h-1"
        style={{ background: isActive ? 'linear-gradient(90deg,#5CB800,#78D900)' : '#e5e7eb' }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-gray-300 font-medium tabular-nums mt-0.5">
            #{project.projectId}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            isActive
              ? 'bg-accent-light text-accent-dark'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
            {isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>

        {/* Project name */}
        <div className="text-right">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">
            {project.projectNameHe || project.projectNameEn || `מחקר #${project.projectId}`}
          </h3>
          {project.principalResearcherId && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5 justify-end">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {project.principalResearcherId}
            </p>
          )}
        </div>

        {/* Performance Score — only for active projects */}
        {healthScore !== null && (
          <PerformanceBadge score={healthScore} project={project} />
        )}

        {/* Budget panel */}
        <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 space-y-3 mt-auto">
          <div className="flex justify-between items-end" dir="rtl">
            <div className="text-right">
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">יתרה זמינה</p>
              <p className={`text-xl font-extrabold tabular-nums leading-none ${
                balanceNegative ? 'text-red-600' : 'text-accent-dark'
              }`}>
                {fmt(remaining)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">תקציב</p>
              <p className="text-sm font-bold text-gray-600 tabular-nums">{fmt(budget)}</p>
            </div>
          </div>

          {project.totalFuture > 0 && (
            <div className="flex justify-between text-[11px] border-t border-gray-200 pt-2.5" dir="rtl">
              <span className="text-gray-400">זמין לאחר התחייבויות</span>
              <span className="font-semibold text-amber-600 tabular-nums">{fmt(available)}</span>
            </div>
          )}

          <UsageBar percent={usagePct} />
        </div>

      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.projectId}`)}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150 cursor-pointer"
        >
          כניסה למחקר
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
