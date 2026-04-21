import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TODAY = new Date().toISOString().split('T')[0];

function getIsActive(project) {
  const rawActive = project.status === 'פעיל' || project.status === 'Active' || project.status === 'active';
  return rawActive && (!project.endDate || String(project.endDate).slice(0, 10) >= TODAY);
}

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

// ── Performance Score Algorithm ───────────────────────────────────────────────
// Score starts at 100. Only 3 factors can reduce it:
//   1. Pending payment approvals
//   2. High spending + commitments relative to remaining time
//   3. Under-utilization of budget near project end

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
  const budget  = project.totalBudget || 0;
  const paid    = project.totalPaid ?? 0;
  const pending = project.pendingCount ?? 0;
  const future  = project.totalFuture ?? 0;

  const timeMetrics    = getTimeMetrics(project);
  const timeElapsedPct = timeMetrics?.raw ?? 0;
  const budgetUsedPct  = budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;

  // ── Penalty 1: Pending approvals (max −25) ─────────────────────────────────
  const pendingPenalty = Math.min(pending * 5, 25);

  // ── Penalty 2: High spending + commitments vs remaining time (max −40) ─────
  // committedPct = (paid + future) / budget — everything already spent or reserved.
  // If this ratio is far ahead of elapsed time, the project is over-committing.
  let burnPenalty = 0;
  if (budget > 0 && timeElapsedPct > 5) {
    const committedPct = Math.min(((paid + future) / budget) * 100, 100);
    const burnRate     = committedPct / timeElapsedPct; // >1 = committing faster than time
    if (burnRate > 1.2) {
      burnPenalty = Math.min(Math.round((burnRate - 1.2) * 50), 40);
    }
  }

  // ── Penalty 3: Under-utilization near project end (max −25) ────────────────
  // Only kicks in when ≥80% of the timeline has passed.
  let underutilPenalty = 0;
  if (timeElapsedPct >= 80 && budget > 0) {
    if (budgetUsedPct < 50)      underutilPenalty = 25;
    else if (budgetUsedPct < 70) underutilPenalty = 10;
  }

  const score = 100 - pendingPenalty - burnPenalty - underutilPenalty;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getPerformanceLabel(score) {
  if (score >= 80) return { label: 'ביצועים מצוינים',  color: '#5CB800', bg: '#f0fae0', ring: '#5CB800' };
  if (score >= 60) return { label: 'ביצועים תקינים',   color: '#0ea5e9', bg: '#f0f9ff', ring: '#0ea5e9' };
  if (score >= 40) return { label: 'דורש תשומת לב',    color: '#f59e0b', bg: '#fffbeb', ring: '#f59e0b' };
  return               { label: 'סיכון תקציבי גבוה',  color: '#ef4444', bg: '#fef2f2', ring: '#ef4444' };
}

function buildPerformanceExplanation(project) {
  const budget  = project.totalBudget || 0;
  const paid    = project.totalPaid ?? 0;
  const pending = project.pendingCount ?? 0;
  const future  = project.totalFuture ?? 0;

  const timeMetrics    = getTimeMetrics(project);
  const timeElapsedPct = timeMetrics?.timeElapsedPct ?? 0;
  const timeRaw        = timeMetrics?.raw ?? 0;
  const budgetUsedPct  = budget > 0 ? Math.round((paid / budget) * 100) : 0;

  const reasons      = [];
  const improvements = [];

  // 1. Pending approvals
  if (pending === 0) {
    reasons.push('✅ אין בקשות תשלום ממתינות לאישור');
  } else {
    const icon = pending > 4 ? '🔴' : '⚠️';
    reasons.push(`${icon} ${pending} בקשות תשלום ממתינות לאישור`);
    improvements.push('אשר או דחה את הבקשות הממתינות בהקדם');
  }

  // 2. Spending + commitments vs remaining time
  if (budget > 0 && timeRaw > 5) {
    const committedPct = Math.min(Math.round(((paid + future) / budget) * 100), 100);
    const burnRate     = committedPct / timeRaw;
    if (burnRate <= 1.2) {
      reasons.push(`✅ קצב ניצול תקציב תקין — ${committedPct}% מהתקציב נוצל או מתוכנן, ${timeElapsedPct}% מהזמן עבר`);
    } else if (burnRate <= 1.6) {
      reasons.push(`⚠️ קצב הוצאות גבוה — ${committedPct}% מהתקציב כבר נוצל/הוקצה, אך רק ${timeElapsedPct}% מהזמן עבר`);
      improvements.push('שקול דחיית חלק מההתחייבויות העתידיות');
    } else {
      reasons.push(`🔴 קצב הוצאות גבוה מאוד — ${committedPct}% מהתקציב כבר נוצל/הוקצה, אך רק ${timeElapsedPct}% מהזמן עבר`);
      improvements.push('הגש בקשה לתוספת תקציב או צמצם הוצאות עתידיות בהקדם');
    }
  } else if (budget > 0) {
    reasons.push(budgetUsedPct > 0 ? `ℹ️ ${budgetUsedPct}% מהתקציב נוצל` : '✅ טרם נרשמו הוצאות');
  }

  // 3. Under-utilization near end
  if (timeRaw >= 80 && budget > 0) {
    const timeLeft = 100 - timeElapsedPct;
    if (budgetUsedPct < 50) {
      reasons.push(`🔴 ניצול תקציב נמוך (${budgetUsedPct}%) — נותרו כ-${timeLeft}% מזמן המחקר`);
      improvements.push('שקול העברת תקציב למחקר אחר הזקוק לו');
      improvements.push('בחן הגדלת הוצאות אם יש צורך בכך עד תום המחקר');
    } else if (budgetUsedPct < 70) {
      reasons.push(`⚠️ ניצול תקציב מתון (${budgetUsedPct}%) עם כ-${timeLeft}% מהזמן שנותר`);
      improvements.push('בחן אם יש הוצאות מתוכננות שטרם בוצעו');
    }
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
