import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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

function getPerformanceLabel(score, dark) {
  if (score >= 80) return { label: 'ביצועים טובים מאוד', color: dark ? '#74D600' : '#5CB800', bg: dark ? 'rgba(92,184,0,0.12)'   : '#f0fae0', ring: dark ? '#5CB800' : '#5CB800' };
  if (score >= 60) return { label: 'ביצועים תקינים',     color: dark ? '#FBBF24' : '#f59e0b', bg: dark ? 'rgba(251,191,36,0.1)'  : '#fffbeb', ring: dark ? '#f59e0b' : '#f59e0b' };
  return               { label: 'נדרשת תשומת לב',       color: dark ? '#F87171' : '#ef4444', bg: dark ? 'rgba(248,113,113,0.1)' : '#fef2f2', ring: dark ? '#ef4444' : '#ef4444' };
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

  // reasons: { type: 'ok'|'warn'|'error'|'info', text: string }[]
  const reasons      = [];
  const improvements = [];

  // 1A: Pending payment requests
  if (pending === 0) {
    reasons.push({ type: 'ok', text: 'לא קיימות בקשות תשלום הממתינות לאישור.' });
  } else {
    reasons.push({ type: 'warn', text: `קיימות ${pending} בקשות תשלום הממתינות לאישור.` });
    improvements.push('מומלץ לבדוק ולטפל בבקשות התשלום הממתינות לאישור, כדי למנוע עיכובים בפעילות המחקר ובניצול התקציב.');
  }

  // 1B: Pending hour approvals
  if (hourPending === 0) {
    reasons.push({ type: 'ok', text: 'דיווחי השעות הוגשו במלואם.' });
  } else {
    reasons.push({ type: 'warn', text: `קיימים ${hourPending} דוחות שעות הממתינים לאישור.` });
    improvements.push('מומלץ לאשר את דוחות השעות הממתינים, כדי למנוע עיכוב בתשלום לעוזרי המחקר.');
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
      reasons.push({ type: 'ok', text: `קצב ניצול התקציב תקין — ${budgetUsageDisp}% נוצל, ${timeProgressDisp}% מהזמן חלף.` });
    } else {
      const underusing = timeProgress > budgetUsageRaw;
      reasons.push({ type: 'warn', text: `קיים פער בין שיעור הזמן שחלף לבין שיעור ניצול התקציב: ${timeProgressDisp}% מהזמן חלף, אך נוצלו ${budgetUsageDisp}% מהתקציב.` });
    }

    // Special case 1: near end, too much budget unused
    if (timeProgress >= 70 && budgetUsageRaw < 60) {
      reasons.push({ type: 'error', text: 'המחקר מתקרב לסיומו אך חלק ניכר מהתקציב טרם נוצל.' });
      improvements.push('מומלץ לבחון את הצרכים הנותרים ואת תכנית ההוצאות עד לסיום המחקר, ולשקול האם רלוונטי לבצע העברת תקציב.');
    }

    // Special case 2: near end, budget nearly exhausted
    if (timeProgress >= 70 && budgetUsageRaw > 90) {
      reasons.push({ type: 'error', text: 'המחקר מתקרב לסיומו וכמעט כל התקציב מוצה.' });
      improvements.push('מומלץ לבחון בזהירות את ההוצאות הצפויות הנותרות ולהימנע מאישור תשלומים שאינם הכרחיים.');
    }

    // Special case 3: early stage, spending too fast
    if (timeProgress <= 30 && budgetUsageRaw > 50) {
      reasons.push({ type: 'error', text: 'שיעור ניצול התקציב גבוה בשלב מוקדם של המחקר.' });
      improvements.push('מומלץ לבחון את ההוצאות האחרונות ולוודא שקצב ההוצאות ברי-קיימא עד לסיום המחקר.');
    }
  } else if (!timeMetrics) {
    reasons.push({ type: 'info', text: 'לא הוגדרו תאריכי התחלה וסיום — לא ניתן לחשב קצב ניצול התקציב.' });
  } else {
    reasons.push({ type: 'info', text: 'לא הוגדר תקציב — לא ניתן לחשב קצב ניצול.' });
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
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {percent}%
        </span>
        <span className="text-sm text-gray-400">ניצול תקציב</span>
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
  const { dark } = useTheme();
  const { label, color, bg, ring } = getPerformanceLabel(score, dark);
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
            <circle cx="18" cy="18" r="15" fill="none" stroke={dark ? '#2A3A50' : '#e5e7eb'} strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={color} strokeWidth="3"
              strokeDasharray={`${(score / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color }}>
            {score}
          </span>
        </div>

        {/* Label */}
        <div className="text-right flex-1 min-w-0">
          <p className="text-sm text-gray-400 leading-none mb-0.5">ציון ביצועי המחקר</p>
          <p className="text-sm font-bold leading-none" style={{ color }}>{label}</p>
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
          <div className="pt-2 space-y-1.5">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">
                  {r.type === 'ok' && (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {r.type === 'warn' && (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {r.type === 'error' && (
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {r.type === 'info' && (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </span>
                <p className="text-sm text-gray-600 leading-snug">{r.text}</p>
              </div>
            ))}
          </div>

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="pt-1.5 border-t" style={{ borderColor: ring + '30' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">פעולות מומלצות</p>
              {improvements.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 mt-1.5">
                  <span className="mt-0.5 flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3-3 3M6 12h10" />
                    </svg>
                  </span>
                  <p className="text-sm text-gray-600 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ riskInsight }) {
  if (!riskInsight || riskInsight.risk_score == null) return null;
  const score = riskInsight.risk_score;
  const pct = Math.round(score * 100);

  // Backend only flags binary "בסיכון" at score >= 0.5 (kept as-is elsewhere, e.g.
  // cluster danger counts) — this splits the "not officially at risk" range into
  // low/medium for a more informative badge, without changing that cutoff.
  const tier =
    score >= 0.5 ? 'high' : score >= 0.25 ? 'medium' : 'low';

  const styles = {
    low:    'bg-gray-50 text-gray-500 border-gray-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high:   'bg-orange-50 text-orange-700 border-orange-200',
  };
  const labels = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };

  return (
    <div
      title="הערכה המבוססת על קצב ניצול התקציב, הזמן שנותר, התחייבויות ובקשות תשלום פתוחות."
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold cursor-default ${styles[tier]}`}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span>רמת סיכון תקציבי חזויה: {labels[tier]} — {pct}%</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectCard({ project, riskInsight }) {
  const navigate  = useNavigate();
  const { dark }  = useTheme();
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
        style={{ background: isActive ? 'linear-gradient(90deg,#5CB800,#78D900)' : (dark ? '#2A3A50' : '#e5e7eb') }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-gray-300 font-medium tabular-nums mt-0.5">
            #{project.projectId}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
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
          <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">
            {project.projectNameHe || project.projectNameEn || `מחקר #${project.projectId}`}
          </h3>
          {project.principalResearcherId && (
            <p className="text-sm text-gray-400 mt-1.5 flex items-center gap-1.5 justify-end">
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

        {/* ML risk prediction — only for active projects */}
        {isActive && <RiskBadge riskInsight={riskInsight} />}

        {/* Budget panel */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-3 mt-auto">
          <div className="flex justify-between items-end" dir="rtl">
            <div className="text-right">
              <p className="text-sm text-gray-400 font-medium mb-0.5">יתרה זמינה</p>
              <p className={`text-xl font-extrabold tabular-nums leading-none ${
                balanceNegative ? 'text-red-600' : 'text-accent-dark'
              }`}>
                {fmt(remaining)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-400 font-medium mb-0.5">תקציב</p>
              <p className="text-sm font-bold text-gray-600 tabular-nums">{fmt(budget)}</p>
            </div>
          </div>

          {project.totalFuture > 0 && (
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2.5" dir="rtl">
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
