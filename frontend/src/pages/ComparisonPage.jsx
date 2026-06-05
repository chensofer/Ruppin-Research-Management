import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getAllProjects, getCommitments } from '../api/projectsApi';
import { getPaymentRequestsByProject } from '../api/paymentRequestsApi';
import Layout from '../components/Layout';

const TODAY    = new Date().toISOString().split('T')[0];
const TODAY_MS = Date.now();

const fmt  = (v) => `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(v ?? 0)}`;
const fmtK = (v) => {
  if (v == null || v === 0) return '₪0';
  return fmt(v);
};

const isActive = (p) => {
  const active = p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';
  return active && (!p.endDate || String(p.endDate).slice(0, 10) >= TODAY);
};

const COLORS = ['#003478','#5CB800','#f59e0b','#8b5cf6','#ef4444','#0ea5e9','#ec4899','#14b8a6','#f97316','#6366f1'];
const MONTH_NAMES   = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const QUARTER_NAMES = ['רבעון 1','רבעון 2','רבעון 3','רבעון 4'];

function groupByPeriod(requests, period) {
  const paid = (requests ?? []).filter(r => r.status === 'אושר' || r.status === 'שולם');
  const map = {};
  paid.forEach((r) => {
    const dateStr = r.requestDate || r.decisionDate;
    if (!dateStr) return;
    const d = new Date(dateStr);
    let key;
    if (period === 'monthly')   key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (period === 'quarterly') key = `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`;
    if (period === 'yearly')    key = `${d.getFullYear()}`;
    if (!key) return;
    map[key] = (map[key] ?? 0) + (r.requestedAmount ?? 0);
  });
  return map;
}

function periodLabel(key, period) {
  if (period === 'monthly') {
    const [y, m] = key.split('-');
    return `${MONTH_NAMES[parseInt(m)-1]} ${y}`;
  }
  if (period === 'quarterly') {
    const [y, q] = key.split('-');
    return `${QUARTER_NAMES[parseInt(q.replace('Q',''))-1]} ${y}`;
  }
  return key;
}

function calcTimePct(p) {
  const s = p.startDate ? String(p.startDate).slice(0,10) : null;
  const e = p.endDate   ? String(p.endDate).slice(0,10)   : null;
  if (!s || !e || e <= s) return null;
  return Math.min(Math.max(Math.round(((TODAY_MS - new Date(s).getTime()) / (new Date(e) - new Date(s))) * 100), 0), 100);
}

function calcDaysLeft(p) {
  if (!p.endDate) return null;
  return Math.max(0, Math.round((new Date(String(p.endDate).slice(0,10)) - new Date(TODAY)) / 86_400_000));
}

function buildMetrics(selectedProjects, compareData) {
  return [
    {
      label: 'תקציב כולל', icon: '💼',
      values: selectedProjects.map(p => ({ raw: p.totalBudget ?? 0, display: fmtK(p.totalBudget) })),
    },
    {
      label: 'סה״כ הוצאות בפועל', icon: '💸',
      values: selectedProjects.map(p => ({ raw: p.totalPaid ?? 0, display: fmtK(p.totalPaid) })),
    },
    {
      label: 'יתרה זמינה', icon: '💰',
      values: selectedProjects.map(p => {
        const v = p.availableBalance ?? 0;
        return { raw: Math.max(v,0), display: fmtK(v),
          badge: v < 0 ? { text: 'גירעון', cls: 'bg-red-100 text-red-700' } : null };
      }),
    },
    {
      label: '% ניצול תקציב', icon: '📊',
      values: selectedProjects.map(p => {
        const pct = (p.totalBudget ?? 0) > 0 ? Math.round(((p.totalPaid ?? 0) / p.totalBudget) * 100) : 0;
        return { raw: pct, display: `${pct}%`,
          badge: pct >= 90 ? { text: 'קריטי', cls: 'bg-red-100 text-red-700' }
               : pct >= 70 ? { text: 'גבוה',  cls: 'bg-amber-100 text-amber-700' } : null };
      }),
    },
    {
      label: 'בקשות ממתינות', icon: '⏳',
      values: selectedProjects.map(p => {
        const v = p.pendingCount ?? 0;
        return { raw: v, display: `${v}`,
          sub: v === 0 ? 'ללא ממתינות' : `${v} בקשות`,
          badge: v > 0 ? { text: `${v}`, cls: 'bg-yellow-100 text-yellow-700' } : null };
      }),
    },
    {
      label: 'התחייבויות עתידיות', icon: '📋',
      values: selectedProjects.map(p => {
        const cmts  = (compareData[p.projectId]?.commitments ?? []).filter(c => c.status !== 'בוטל');
        const total = cmts.reduce((s, c) => s + (c.expectedAmount ?? 0), 0);
        return { raw: total, display: fmtK(total),
          sub: cmts.length > 0 ? `${cmts.length} התחייבויות` : 'אין התחייבויות' };
      }),
    },
    {
      label: 'מספר הוצאות', icon: '🧾',
      values: selectedProjects.map(p => {
        const reqs     = compareData[p.projectId]?.requests ?? [];
        const approved = reqs.filter(r => r.status === 'אושר' || r.status === 'שולם').length;
        const pending  = reqs.filter(r => r.status === 'ממתין').length;
        return { raw: approved, display: `${approved}`,
          sub: pending > 0 ? `+ ${pending} ממתינות` : 'הוצאות מאושרות' };
      }),
    },
    {
      label: '% זמן שעבר', icon: '⏱️',
      values: selectedProjects.map(p => {
        const pct = calcTimePct(p);
        return { raw: pct ?? 0, display: pct != null ? `${pct}%` : '—',
          sub: pct != null ? 'מהתקופה עברה' : 'אין תאריכים',
          badge: pct != null && pct >= 90 ? { text: 'קרוב לסיום', cls: 'bg-orange-100 text-orange-700' } : null };
      }),
    },
    {
      label: 'ימים לסיום', icon: '📅',
      values: selectedProjects.map(p => {
        const dl = calcDaysLeft(p);
        return { raw: dl ?? 99999, display: dl != null ? `${dl}` : '—',
          sub: dl != null ? 'ימים נותרו' : 'אין תאריך סיום',
          badge: dl != null && dl <= 30  ? { text: 'דחוף',  cls: 'bg-red-100 text-red-700' }
               : dl != null && dl <= 90  ? { text: 'בקרוב', cls: 'bg-amber-100 text-amber-700' } : null };
      }),
    },
    {
      label: 'קצב שריפת תקציב', icon: '🔥',
      values: selectedProjects.map(p => {
        const timePct  = calcTimePct(p);
        const usagePct = (p.totalBudget ?? 0) > 0 ? ((p.totalPaid ?? 0) / p.totalBudget) * 100 : 0;
        if (!timePct) return { raw: 0, display: '—', sub: 'אין נתונים' };
        const rate = Math.round((usagePct / timePct) * 100) / 100;
        return { raw: rate, display: `×${rate.toFixed(2)}`,
          sub: rate > 1 ? 'מוציא מהר מהצפוי' : rate < 1 ? 'מוציא לאט מהצפוי' : 'בקצב תקין',
          badge: rate > 1.3 ? { text: 'מהיר מדי', cls: 'bg-red-100 text-red-700' }
               : rate < 0.5 ? { text: 'איטי',     cls: 'bg-blue-100 text-blue-700' } : null };
      }),
    },
  ];
}

// ── Transfer recommendations ──────────────────────────────────────────────────
function buildTransferRecommendations(projects) {
  const enriched = projects.map(p => {
    const timePct  = calcTimePct(p);
    const budget   = p.totalBudget ?? 0;
    const paid     = p.totalPaid   ?? 0;
    const avail    = p.availableBalance ?? 0;
    const usagePct = budget > 0 ? (paid / budget) * 100 : 0;
    const burnRate = (timePct && timePct > 0) ? usagePct / timePct : null;
    const daysLeft = calcDaysLeft(p);

    const isGiver =
      avail > Math.max(budget * 0.15, 5000) &&
      (burnRate === null || burnRate < 0.80) &&
      (daysLeft === null || daysLeft > 45);

    const isReceiver =
      avail < 0 ||
      (budget > 0 && usagePct > 78 && (burnRate === null || burnRate > 1.1));

    return { ...p, timePct, budget, paid, avail, usagePct, burnRate, daysLeft, isGiver, isReceiver };
  });

  const givers    = enriched.filter(p => p.isGiver).sort((a, b) => b.avail - a.avail);
  const receivers = enriched.filter(p => p.isReceiver).sort((a, b) => a.avail - b.avail);

  const recs = [];
  const usedGivers = new Set();

  for (const recv of receivers) {
    const giver = givers.find(g => g.projectId !== recv.projectId && !usedGivers.has(g.projectId));
    if (!giver) break;

    const need   = recv.avail < 0 ? Math.abs(recv.avail) + recv.budget * 0.05 : recv.budget * 0.12;
    const amount = Math.min(giver.avail * 0.35, need);
    if (amount < 2000) continue;

    usedGivers.add(giver.projectId);

    const tags = [];
    if (giver.burnRate !== null && giver.burnRate < 0.80)
      tags.push(`קצב שריפה נמוך (×${giver.burnRate.toFixed(2)})`);
    if (giver.daysLeft !== null && giver.daysLeft > 45)
      tags.push(`${giver.daysLeft} ימים נותרו למקור`);
    if (recv.avail < 0)
      tags.push(`גירעון ${fmt(Math.abs(recv.avail))}`);
    if (recv.burnRate !== null && recv.burnRate > 1.1)
      tags.push(`קצב שריפה גבוה (×${recv.burnRate.toFixed(2)})`);

    recs.push({ giver, receiver: recv, amount, tags });
  }
  return recs;
}

// ── Similarity groups ─────────────────────────────────────────────────────────
function buildSimilarityGroups(projects) {
  const cat = (p) => {
    const budget   = p.totalBudget ?? 0;
    const paid     = p.totalPaid   ?? 0;
    const timePct  = calcTimePct(p);
    const usagePct = budget > 0 ? (paid / budget) * 100 : 0;
    const burnRate = (timePct && timePct > 0) ? usagePct / timePct : null;
    const daysLeft = calcDaysLeft(p);
    return {
      budgetTier: budget < 60000 ? 'small' : budget < 350000 ? 'medium' : 'large',
      burnTier:   burnRate === null ? null : burnRate < 0.75 ? 'slow' : burnRate > 1.25 ? 'fast' : 'normal',
      timeTier:   daysLeft === null ? null : daysLeft < 30 ? 'urgent' : daysLeft < 180 ? 'mid' : 'long',
    };
  };

  const enriched = projects.map(p => ({ ...p, _cat: cat(p) }));
  const groups   = [];

  // By budget tier
  const budgetLabels = { small: 'תקציב קטן (עד ₪60k)', medium: 'תקציב בינוני (₪60k–₪350k)', large: 'תקציב גדול (מעל ₪350k)' };
  const budgetIcons  = { small: '🪙', medium: '💵', large: '💰' };
  for (const tier of ['small','medium','large']) {
    const items = enriched.filter(p => p._cat.budgetTier === tier);
    if (items.length < 2) continue;
    groups.push({
      icon: budgetIcons[tier], title: `מחקרים עם ${budgetLabels[tier]}`,
      insight: `${items.length} מחקרים בטווח תקציב דומה — כדאי להשוות ניצול`,
      projects: items, alert: false,
    });
  }

  // Fast burners
  const fast = enriched.filter(p => p._cat.burnTier === 'fast');
  if (fast.length >= 1)
    groups.push({ icon: '🔥', title: 'שריפת תקציב מהירה', alert: true, projects: fast,
      insight: 'מחקרים שמוציאים מהר מהצפוי — מועמדים לקבל העברת תקציב' });

  // Slow burners
  const slow = enriched.filter(p => p._cat.burnTier === 'slow');
  if (slow.length >= 1)
    groups.push({ icon: '🐢', title: 'שריפת תקציב איטית', alert: false, projects: slow,
      insight: 'מחקרים שעשויים לסיים עם יתרה — מועמדים לתת העברת תקציב' });

  // Urgent timeline
  const urgent = enriched.filter(p => p._cat.timeTier === 'urgent');
  if (urgent.length >= 1)
    groups.push({ icon: '⚠️', title: 'קרובים לסיום (פחות מ-30 יום)', alert: true, projects: urgent,
      insight: 'יש לטפל ביתרות עודפות בדחיפות לפני סגירת המחקר' });

  return groups;
}

function buildExplanation(giver, receiver) {
  const parts = [];
  const giverName = giver.projectNameHe || giver.projectNameEn || `מחקר #${giver.projectId}`;
  const recvName  = receiver.projectNameHe || receiver.projectNameEn || `מחקר #${receiver.projectId}`;

  if (giver.daysLeft !== null && giver.daysLeft <= 90)
    parts.push(`"${giverName}" עומד להסתיים בעוד ${giver.daysLeft} ימים עם יתרה של ${fmt(giver.avail)}.`);
  else if (giver.burnRate !== null && giver.burnRate < 0.75)
    parts.push(`"${giverName}" מוציא לאט מהצפוי — צפויה יתרה עודפת של ${fmt(giver.avail)} בסיום.`);
  else
    parts.push(`"${giverName}" מחזיק יתרה זמינה של ${fmt(giver.avail)}.`);

  if (receiver.avail < 0)
    parts.push(`"${recvName}" נמצא בגירעון של ${fmt(Math.abs(receiver.avail))}.`);
  else if (receiver.burnRate !== null && receiver.burnRate > 1.1)
    parts.push(`"${recvName}" מוציא מהר מהצפוי ועלול לחרוג מהתקציב.`);
  else
    parts.push(`"${recvName}" ניצל ${Math.round(receiver.usagePct)}% מהתקציב וזקוק לחיזוק.`);

  return parts.join(' ');
}

function StatBadge({ color, children }) {
  const colors = {
    green:  'bg-green-100 text-green-800 border border-green-200',
    red:    'bg-red-100 text-red-800 border border-red-200',
    amber:  'bg-amber-100 text-amber-800 border border-amber-200',
    gray:   'bg-gray-100 text-gray-600 border border-gray-200',
    blue:   'bg-blue-100 text-blue-800 border border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function BudgetBar({ pct, color }) {
  const capped = Math.min(pct, 100);
  const barColor = color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

function RecommendationCard({ rec, onTransfer }) {
  const { giver, receiver, amount } = rec;
  const explanation = buildExplanation(giver, receiver);

  const giverUsagePct  = Math.round(giver.usagePct ?? 0);
  const receiverUsagePct = Math.round(receiver.usagePct ?? 0);
  const giverBarColor  = giverUsagePct > 80 ? 'amber' : 'green';
  const receiverBarColor = receiver.avail < 0 ? 'red' : receiverUsagePct > 80 ? 'red' : 'amber';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
      <div className="h-1 bg-gradient-to-l from-primary to-accent" />

      <div className="p-5 space-y-4">
        {/* שני המחקרים + חץ */}
        <div className="flex items-stretch gap-3">

          {/* מקור — יתרה עודפת */}
          <div className="flex-1 bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📤</span>
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">מקור</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-snug">
                {giver.projectNameHe || giver.projectNameEn || `מחקר #${giver.projectId}`}
              </p>
              {giver.principalResearcherName && (
                <p className="text-[11px] text-gray-500 mt-0.5">👤 {giver.principalResearcherName}</p>
              )}
            </div>

            {/* מספר ראשי — יתרה */}
            <div className="bg-white border border-green-200 rounded-xl px-3 py-2">
              <p className="text-[10px] text-green-700 font-semibold mb-0.5">✅ יתרה זמינה</p>
              <p className="text-lg font-extrabold text-green-700 leading-none">{fmt(giver.avail)}</p>
              <BudgetBar pct={giverUsagePct} color={giverBarColor} />
              <p className="text-[10px] text-gray-400 mt-1">{giverUsagePct}% מהתקציב נוצל</p>
            </div>

            {/* תגיות */}
            <div className="flex flex-wrap gap-1">
              {giver.burnRate !== null && (
                <StatBadge color={giver.burnRate < 0.75 ? 'green' : 'gray'}>
                  {giver.burnRate < 0.75 ? '🐢 קצב איטי' : '📊 קצב תקין'}
                </StatBadge>
              )}
              {giver.daysLeft !== null && (
                <StatBadge color={giver.daysLeft <= 30 ? 'amber' : giver.daysLeft <= 90 ? 'amber' : 'green'}>
                  {giver.daysLeft <= 30 ? `⚠️ ${giver.daysLeft} ימים` : `📅 ${giver.daysLeft} ימים`}
                </StatBadge>
              )}
            </div>
          </div>

          {/* חץ + סכום */}
          <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
            <div className="bg-primary text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow whitespace-nowrap">
              {fmt(amount)}
            </div>
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>

          {/* יעד — זקוק לתקציב */}
          <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📥</span>
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">יעד</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-snug">
                {receiver.projectNameHe || receiver.projectNameEn || `מחקר #${receiver.projectId}`}
              </p>
              {receiver.principalResearcherName && (
                <p className="text-[11px] text-gray-500 mt-0.5">👤 {receiver.principalResearcherName}</p>
              )}
            </div>

            {/* מספר ראשי — גירעון או ניצול גבוה */}
            <div className={`border rounded-xl px-3 py-2 ${receiver.avail < 0 ? 'bg-red-100 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
              {receiver.avail < 0 ? (
                <>
                  <p className="text-[10px] text-red-700 font-semibold mb-0.5">🚨 גירעון תקציבי</p>
                  <p className="text-lg font-extrabold text-red-700 leading-none">−{fmt(Math.abs(receiver.avail))}</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-amber-700 font-semibold mb-0.5">⚠️ ניצול גבוה</p>
                  <p className="text-lg font-extrabold text-amber-700 leading-none">{receiverUsagePct}%</p>
                </>
              )}
              <BudgetBar pct={receiverUsagePct} color={receiverBarColor} />
              <p className="text-[10px] text-gray-400 mt-1">{receiverUsagePct}% מהתקציב נוצל</p>
            </div>

            {/* תגיות */}
            <div className="flex flex-wrap gap-1">
              {receiver.burnRate !== null && (
                <StatBadge color={receiver.burnRate > 1.1 ? 'red' : 'gray'}>
                  {receiver.burnRate > 1.1 ? '🔥 קצב מהיר' : '📊 קצב תקין'}
                </StatBadge>
              )}
              {receiver.daysLeft !== null && (
                <StatBadge color={receiver.daysLeft <= 30 ? 'red' : receiver.daysLeft <= 90 ? 'amber' : 'gray'}>
                  {receiver.daysLeft <= 30 ? `🚨 ${receiver.daysLeft} ימים` : `📅 ${receiver.daysLeft} ימים`}
                </StatBadge>
              )}
            </div>
          </div>
        </div>

        {/* הסבר */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex gap-2 items-start">
          <span className="text-blue-500 text-sm mt-0.5 flex-shrink-0">💬</span>
          <p className="text-xs text-blue-800 leading-relaxed">{explanation}</p>
        </div>

        {/* כפתור */}
        <button
          onClick={() => onTransfer(giver.projectId, receiver.projectId, amount)}
          className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          עבור לביצוע העברת תקציב
        </button>
      </div>
    </div>
  );
}

function ProjectHealthCard({ p, navigate }) {
  const avail     = p.availableBalance ?? 0;
  const budget    = p.totalBudget ?? 0;
  const usagePct  = budget > 0 ? Math.min(Math.round(((p.totalPaid ?? 0) / budget) * 100), 100) : 0;
  const daysLeft  = calcDaysLeft(p);
  const isDeficit = avail < 0;

  const health =
    isDeficit || usagePct >= 90 ? 'danger'
    : usagePct >= 70             ? 'warning'
    :                              'good';

  const borderColor = health === 'danger' ? 'border-red-300'   : health === 'warning' ? 'border-amber-300'  : 'border-green-200';
  const barColor    = health === 'danger' ? 'bg-red-500'        : health === 'warning' ? 'bg-amber-400'       : 'bg-green-500';
  const badgeCls    = health === 'danger' ? 'bg-red-100 text-red-700 border-red-200'
                    : health === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200'
                    :                        'bg-green-100 text-green-700 border-green-200';
  const statusIcon  = health === 'danger' ? '🚨' : health === 'warning' ? '⚠️' : '✅';

  return (
    <button
      key={p.projectId}
      onClick={() => navigate(`/projects/${p.projectId}`)}
      className={`text-right bg-white hover:bg-gray-50 border ${borderColor} rounded-xl p-3.5 transition-all group flex flex-col gap-2 w-full`}
    >
      {/* שורה עליונה: שם + אחוז */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-gray-800 leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`}
        </p>
        <span className={`flex-shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${badgeCls}`}>
          {usagePct}%
        </span>
      </div>

      {/* פס ניצול תקציב */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${usagePct}%` }} />
      </div>

      {/* יתרה / גירעון */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{statusIcon}</span>
        <p className={`text-xs font-extrabold ${isDeficit ? 'text-red-600' : 'text-green-700'}`}>
          {isDeficit ? `גירעון ${fmt(Math.abs(avail))}` : `יתרה ${fmt(avail)}`}
        </p>
      </div>

      {/* ימים לסיום */}
      {daysLeft !== null && (
        <p className={`text-[11px] font-medium ${
          daysLeft <= 30  ? 'text-red-600'
          : daysLeft <= 90 ? 'text-amber-600'
          : 'text-gray-400'
        }`}>
          📅 {daysLeft} ימים לסיום
        </p>
      )}
    </button>
  );
}

function SimilarityGroupCard({ group, navigate }) {
  const dangerCount  = group.projects.filter(p => {
    const u = (p.totalBudget ?? 0) > 0 ? Math.round(((p.totalPaid ?? 0) / p.totalBudget) * 100) : 0;
    return (p.availableBalance ?? 0) < 0 || u >= 90;
  }).length;
  const warningCount = group.projects.filter(p => {
    const u = (p.totalBudget ?? 0) > 0 ? Math.round(((p.totalPaid ?? 0) / p.totalBudget) * 100) : 0;
    const avail = p.availableBalance ?? 0;
    return avail >= 0 && u >= 70 && u < 90;
  }).length;

  const headerBg = group.alert ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100';
  const cardBorder = group.alert ? 'border-amber-300' : 'border-gray-100';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${cardBorder}`} dir="rtl">
      {/* כותרת */}
      <div className={`px-5 py-3.5 flex items-center justify-between border-b ${headerBg}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl leading-none flex-shrink-0">{group.icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800">{group.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{group.insight}</p>
          </div>
        </div>
        {/* סיכום בריאות הקבוצה */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
          {dangerCount > 0 && (
            <span className="text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              🚨 {dangerCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              ⚠️ {warningCount}
            </span>
          )}
          <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {group.projects.length} מחקרים
          </span>
        </div>
      </div>

      {/* רשימת מחקרים */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.projects.map(p => (
          <ProjectHealthCard key={p.projectId} p={p} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

function CustomXTick({ x, y, payload }) {
  const { dark } = useTheme();
  const full = payload.value;
  const words = full.split(' ');
  const allLines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 10) {
      if (current) allLines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) allLines.push(current);

  const displayLines = allLines.length > 2
    ? [allLines[0], allLines.slice(1).join(' ').slice(0, 9) + '…']
    : allLines;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      {displayLines.map((line, i) => (
        <text key={i} x={0} y={0} dy={14 + i * 14} textAnchor="middle" fill={dark ? '#6A8099' : '#374151'} fontSize={11}>
          {line}
        </text>
      ))}
    </g>
  );
}

function ChartTooltip({ active, payload, label }) {
  const { dark } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div
      dir="rtl"
      style={{
        background: dark ? '#1C2536' : '#fff',
        border: `1px solid ${dark ? '#2A3A50' : '#e5e7eb'}`,
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
        textAlign: 'right',
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color: dark ? '#EAF1FB' : '#1f2937', marginBottom: 6 }}>{label}</p>
      {payload.map((e) => (
        <p key={e.name} style={{ fontSize: 11, marginTop: 2, color: e.color }}>{e.name}: {fmt(e.value)}</p>
      ))}
    </div>
  );
}

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dark } = useTheme();
  const gridColor   = dark ? '#2A3A50' : '#f0f0f0';
  const axisColor   = dark ? '#6A8099' : '#6b7280';
  const cursorFill  = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const barChartHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 260 : 420;
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [metric,      setMetric]      = useState('all');
  const urlMode = searchParams.get('mode');
  const [mode,        setMode]        = useState(urlMode === 'recommendations' ? 'recommendations' : 'overview');

  const switchMode = (key) => {
    setMode(key);
    setSearchParams({ mode: key }, { replace: true });
  };

  useEffect(() => {
    setMode(urlMode || 'overview');
  }, [urlMode]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [loadingCmp,  setLoadingCmp]  = useState(false);
  const [period,      setPeriod]      = useState('monthly');
  const [search,      setSearch]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getAllProjects()
      .then((res) => setProjects((res.data ?? []).filter(isActive)))
      .catch(() => toast.error('שגיאה בטעינת הנתונים'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedIds.length === 0) { setCompareData({}); return; }
    setLoadingCmp(true);
    Promise.all(
      selectedIds.map(async (id) => {
        const [reqRes, cmpRes] = await Promise.all([
          getPaymentRequestsByProject(id).catch(() => ({ data: [] })),
          getCommitments(id).catch(() => ({ data: [] })),
        ]);
        return { id, requests: reqRes.data ?? [], commitments: cmpRes.data ?? [] };
      })
    )
      .then((results) => {
        const map = {};
        results.forEach(({ id, requests, commitments }) => { map[id] = { requests, commitments }; });
        setCompareData(map);
      })
      .finally(() => setLoadingCmp(false));
  }, [selectedIds]);

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const chartData = projects.map((p) => ({
    name: p.projectNameHe || p.projectNameEn || `#${p.projectId}`,
    'תקציב כולל':  p.totalBudget ?? 0,
    'הוצאות בפועל': p.totalPaid   ?? 0,
    // Clamp to 0 — negative balance is shown elsewhere; no negative bars in the chart
    'יתרה זמינה':  Math.max(p.availableBalance ?? 0, 0),
  }));

  const METRICS = [
    { key: 'all',       label: 'הכל' },
    { key: 'budget',    label: 'תקציב כולל' },
    { key: 'paid',      label: 'הוצאות בפועל' },
    { key: 'available', label: 'יתרה זמינה' },
  ];

  const PERIODS = [
    { key: 'monthly',   label: 'חודשי' },
    { key: 'quarterly', label: 'רבעוני' },
    { key: 'yearly',    label: 'שנתי' },
  ];

  const selectedProjects  = selectedIds.map(id => projects.find(p => p.projectId === id)).filter(Boolean);
  const recommendations   = useMemo(() => buildTransferRecommendations(projects), [projects]);
  const similarityGroups  = useMemo(() => buildSimilarityGroups(projects), [projects]);

  // Projects shown in the picker (active only, filtered by search query)
  const filteredForDisplay = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (p.projectNameHe || '').toLowerCase().includes(q) ||
      (p.projectNameEn || '').toLowerCase().includes(q)
    );
  });
  const metrics          = buildMetrics(selectedProjects, compareData);

  const trendData = (() => {
    if (selectedProjects.length === 0) return [];
    const allKeys = new Set();
    const grouped = {};
    selectedIds.forEach((id) => {
      const g = groupByPeriod(compareData[id]?.requests ?? [], period);
      grouped[id] = g;
      Object.keys(g).forEach(k => allKeys.add(k));
    });
    return [...allKeys].sort().map((key) => {
      const row = { period: periodLabel(key, period) };
      selectedIds.forEach((id) => {
        const p = selectedProjects.find(x => x.projectId === id);
        row[(p?.projectNameHe || `#${id}`).slice(0,12)] = grouped[id]?.[key] ?? 0;
      });
      return row;
    });
  })();

  return (
    <Layout>
      <div dir="rtl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">השוואות בין מחקרים</h1>
            <p className="text-sm text-gray-400 mt-0.5">{projects.length} מחקרים פעילים</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start flex-wrap">
            {[
              { key: 'overview',        label: 'סקירה כללית' },
              { key: 'compare',         label: '⚖️ השוואה ישירה' },
              { key: 'recommendations', label: '💡 המלצות', badge: recommendations.length },
            ].map((m) => (
              <button key={m.key} onClick={() => switchMode(m.key)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m.label}
                {m.badge > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                    {m.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {mode === 'overview' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-gray-700">השוואת תקציב בין מחקרים פעילים</h2>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  {METRICS.map((m) => (
                    <button key={m.key} onClick={() => setMetric(m.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        metric === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-center text-gray-400 py-20 text-sm">אין מחקרים פעילים להצגה</p>
              ) : (
                <ResponsiveContainer width="100%" height={barChartHeight}>
                  <BarChart data={chartData} margin={{ top: 4, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={<CustomXTick />} interval={0} height={44} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: 13, paddingBottom: '12px', top: 0, color: axisColor }}
                    />
                    {(metric==='all'||metric==='budget')    && <Bar dataKey="תקציב כולל"  fill="#93c5fd" radius={[4,4,0,0]} />}
                    {(metric==='all'||metric==='paid')      && <Bar dataKey="הוצאות בפועל" fill="#f87171" radius={[4,4,0,0]} />}
                    {(metric==='all'||metric==='available') && <Bar dataKey="יתרה זמינה"  fill="#4ade80" radius={[4,4,0,0]} />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {!loading && projects.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">פירוט לפי מחקר</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-5 py-3 text-right font-semibold">שם המחקר</th>
                        <th className="px-4 py-3 text-left font-semibold">תקציב כולל</th>
                        <th className="px-4 py-3 text-left font-semibold">הוצאות בפועל</th>
                        <th className="px-4 py-3 text-left font-semibold">יתרה זמינה</th>
                        <th className="px-4 py-3 text-left font-semibold">% ניצול</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {projects.map((p) => {
                        const budget  = p.totalBudget ?? 0;
                        const paid    = p.totalPaid   ?? 0;
                        const avail   = p.availableBalance ?? 0;
                        const usedPct = budget > 0 ? Math.round((paid/budget)*100) : 0;
                        const color   = usedPct >= 90 ? 'text-red-600' : usedPct >= 70 ? 'text-amber-600' : 'text-green-700';
                        return (
                          <tr key={p.projectId} className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/projects/${p.projectId}`)}>
                            <td className="px-5 py-3 font-medium text-gray-800 max-w-[220px] truncate">
                              {p.projectNameHe || p.projectNameEn || `#${p.projectId}`}
                            </td>
                            <td className="px-4 py-3 text-left tabular-nums text-gray-600">{fmt(budget)}</td>
                            <td className="px-4 py-3 text-left tabular-nums text-red-500">{fmt(paid)}</td>
                            <td className="px-4 py-3 text-left tabular-nums text-green-700">{fmt(avail)}</td>
                            <td className={`px-4 py-3 text-left tabular-nums font-bold ${color}`}>{usedPct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'recommendations' && (
          <div dir="rtl">
            {/* המלצות להעברת תקציב */}
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl mt-0.5">💡</span>
                <div>
                  <h2 className="text-base font-extrabold text-gray-800">המלצות להעברת תקציב</h2>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                    מחקרים שעומדים להסתיים עם יתרה עודפת, או מוציאים לאט מהצפוי —<br />
                    יכולים להעביר תקציב למחקרים שזקוקים לו.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recommendations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-sm font-bold text-gray-700">אין המלצות להעברה כרגע</p>
                  <p className="text-xs text-gray-400 mt-1">כל המחקרים מאוזנים מבחינת תקציב ולוח זמנים</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={i}
                      rec={rec}
                      onTransfer={(giverId, receiverId, amount) =>
                        navigate(`/projects/${giverId}?tab=transfer&to=${receiverId}&amount=${Math.round(amount)}`)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* מחקרים דומים */}
            <div>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl mt-0.5">🔗</span>
                <div>
                  <h2 className="text-base font-extrabold text-gray-800">מחקרים דומים</h2>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                    קיבוץ מחקרים לפי גודל תקציב, קצב הוצאות ולוח זמנים — לזיהוי דפוסים משותפים
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : similarityGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <p className="text-sm text-gray-400">אין מספיק מחקרים לסיווג — נדרשים לפחות 2 מחקרים בקטגוריה</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {similarityGroups.map((group, i) => (
                    <SimilarityGroupCard key={i} group={group} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'compare' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                <h2 className="text-sm font-semibold text-gray-700">בחר מחקרים להשוואה</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="חיפוש מחקר..."
                      className="border border-gray-200 rounded-xl pr-3 pl-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white w-full sm:w-44"
                    />
                    {search ? (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 leading-none text-base"
                      >×</button>
                    ) : (
                      <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                    {selectedIds.length} נבחרו
                  </span>
                  <button onClick={() => setSelectedIds(projects.map(p => p.projectId))}
                    className="text-xs text-primary font-semibold hover:underline">בחר הכל</button>
                  {selectedIds.length > 0 && (
                    <button onClick={() => setSelectedIds([])}
                      className="text-xs text-gray-400 font-semibold hover:text-gray-600 hover:underline">נקה</button>
                  )}
                </div>
              </div>

              {/* Result count when searching */}
              {search.trim() && (
                <p className="text-xs text-gray-400 mb-2">
                  מציג {filteredForDisplay.length} מתוך {projects.length} מחקרים פעילים
                </p>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredForDisplay.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">לא נמצאו מחקרים תואמים</p>
              ) : (
                /* Scrollable pill container — max 3 rows before scroll */
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pb-1">
                  {filteredForDisplay.map((p) => {
                    const idx = selectedIds.indexOf(p.projectId);
                    const selected = idx !== -1;
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <button key={p.projectId} onClick={() => toggleSelect(p.projectId)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                          selected
                            ? 'text-white border-transparent shadow-sm'
                            : 'text-gray-600 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                        style={selected ? { backgroundColor: color, borderColor: color } : {}}>
                        {selected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span className="truncate max-w-[160px]">
                          {p.projectNameHe || p.projectNameEn || `#${p.projectId}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedProjects.length < 2 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
                <p className="text-4xl mb-3">⚖️</p>
                <p className="text-sm font-semibold text-gray-500">בחר לפחות 2 מחקרים להשוואה</p>
              </div>
            ) : loadingCmp ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Scroll hint on mobile */}
                <p className="sm:hidden text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  ניתן לגלול לרוחב
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto mb-5" style={{ maxHeight: '75vh' }}>
                    <table className="text-sm" dir="rtl"
                      style={{ minWidth: `${120 + selectedProjects.length * 130}px` }}>
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-3 sm:px-5 py-3 sm:py-4 text-right sticky top-0 right-0 z-30 bg-gray-50 w-28 sm:w-44 border-l border-r-0 border-gray-100">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">פרמטר</span>
                          </th>
                          {selectedProjects.map((p, i) => (
                            <th key={p.projectId}
                              className="px-3 sm:px-4 py-3 sm:py-4 text-right sticky top-0 z-20 border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50"
                              onClick={() => navigate(`/projects/${p.projectId}`)}>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-xs sm:text-sm font-bold text-gray-800 truncate max-w-[90px] sm:max-w-[130px]" title={p.projectNameHe}>
                                  {p.projectNameHe || p.projectNameEn || `#${p.projectId}`}
                                </span>
                              </div>
                              <p className="text-xs text-primary font-medium mt-0.5 mr-4 sm:mr-5 hidden sm:block">פתח מחקר ←</p>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {metrics.map(({ label, icon, values }) => {
                          const raws = values.map(v => v.raw);
                          const max  = Math.max(...raws.filter(v => isFinite(v) && v > 0));
                          return (
                            <tr key={label} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-3 sm:px-5 py-3 sm:py-4 sticky right-0 bg-white border-l border-gray-50 z-10 w-28 sm:w-44">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-sm sm:text-base leading-none">{icon}</span>
                                  <span className="text-[10px] sm:text-xs font-semibold text-gray-600 leading-tight">{label}</span>
                                </div>
                              </td>
                              {values.map((v, i) => {
                                const color = COLORS[i % COLORS.length];
                                const pct   = max > 0 ? (v.raw / max) * 100 : 0;
                                return (
                                  <td key={i} className="px-3 sm:px-4 py-3 sm:py-4 border-r border-gray-50 last:border-r-0 align-top min-w-[110px] sm:min-w-[160px]">
                                    <div className="flex items-start gap-1 sm:gap-1.5 flex-wrap">
                                      <p className="text-sm sm:text-base font-extrabold tabular-nums leading-tight" style={{ color }}>
                                        {v.display}
                                      </p>
                                      {v.badge && (
                                        <span className={`text-[10px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full ${v.badge.cls}`}>
                                          {v.badge.text}
                                        </span>
                                      )}
                                    </div>
                                    {v.sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{v.sub}</p>}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
                    <h2 className="text-sm font-semibold text-gray-700">הוצאות לאורך זמן</h2>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start">
                      {PERIODS.map((pp) => (
                        <button key={pp.key} onClick={() => setPeriod(pp.key)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            period === pp.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}>
                          {pp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {trendData.length === 0 ? (
                    <p className="text-center text-gray-400 py-12 text-sm">אין נתוני הוצאות לתקופה זו</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 300}>
                      <LineChart data={trendData} margin={{ top: 4, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="period" tick={{ fontSize: 12, fill: axisColor }} />
                        <YAxis tick={{ fontSize: 12, fill: axisColor }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v, name) => [fmt(v), name]}
                          contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px', background: dark ? '#1C2536' : '#fff', borderColor: dark ? '#2A3A50' : '#e5e7eb', color: dark ? '#EAF1FB' : '#1f2937' }}
                          cursor={{ stroke: dark ? '#2A3A50' : '#d1d5db' }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '12px' }} />
                        {selectedProjects.map((p, i) => (
                          <Line key={p.projectId} type="monotone"
                            dataKey={(p.projectNameHe || `#${p.projectId}`).slice(0,12)}
                            stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                            dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}