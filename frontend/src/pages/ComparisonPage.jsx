import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getAllProjects, getProjects, getCommitments } from '../api/projectsApi';
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
  if (p.isArchived) return false;
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
function buildTransferRecommendations(projects, myProjectIds) {
  const enriched = projects.map(p => {
    const timePct  = calcTimePct(p);
    const budget   = p.totalBudget ?? 0;
    const paid     = p.totalPaid   ?? 0;
    const avail    = p.availableBalance ?? 0;
    const usagePct = budget > 0 ? (paid / budget) * 100 : 0;
    const burnRate = (timePct && timePct > 0) ? usagePct / timePct : null;
    const daysLeft = calcDaysLeft(p);
    const isMine   = myProjectIds.has(p.projectId);

    const isGiver =
      isMine &&
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

// ── Topic similarity ──────────────────────────────────────────────────────────
// מילות עצור — רק מילות יחס ומילים דקדוקיות בסיסיות
const HE_STOP = new Set([
  'של','על','עם','את','זה','זו','הם','הן','כי','גם','לא','יש','אין','כל',
  'עוד','כבר','רק','אם','כך','מה','מי','איך','למה','לפי','בין','אל','מן',
  'עד','כדי','תוך','אחר','לפני','אך','אולם','לאחר','בגלל','לגבי','לכן',
  'לעומת','בעוד','כאשר','כדי','אשר','שנים','שנה','ימים',
]);

// מסיר קידומות נפוצות (ב, ל, מ, כ, ה, ו, ש) לפני השוואה
function stripPrefix(w) {
  return w.replace(/^[בלמכהוש]/, '');
}

function extractKeywords(name) {
  if (!name) return new Set();
  const words = name
    .replace(/[^א-תa-zA-Z\s]/g, '')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2)
    .map(w => stripPrefix(w))
    .filter(w => w.length > 2 && !HE_STOP.has(w));
  return new Set(words);
}

function jaccardSim(a, b) {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter(x => b.has(x)).length;
  return inter / (a.size + b.size - inter);
}

function buildTopicGroups(projects) {
  const withKw = projects.map(p => ({
    ...p, _kw: extractKeywords(p.projectNameHe || p.projectNameEn || ''),
  }));

  const assigned = new Set();
  const clusters = [];

  for (let i = 0; i < withKw.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [withKw[i]];
    assigned.add(i);
    for (let j = i + 1; j < withKw.length; j++) {
      if (assigned.has(j)) continue;
      if (jaccardSim(withKw[i]._kw, withKw[j]._kw) >= 0.12) {
        cluster.push(withKw[j]); assigned.add(j);
      }
    }
    if (cluster.length < 2) continue;

    const freq = {};
    cluster.forEach(p => [...p._kw].forEach(w => { freq[w] = (freq[w] || 0) + 1; }));
    const topWords = Object.entries(freq)
      .filter(([, c]) => c >= 2).sort(([, a], [, b]) => b - a)
      .slice(0, 5).map(([w]) => w);

    clusters.push({
      icon: '🧬',
      title: topWords.length ? `נושא משותף: ${topWords.join(' · ')}` : 'מחקרים בעלי נושא משותף',
      insight: `${cluster.length} מחקרים חולקים מושגי מפתח זהים — כדאי לתאם`,
      projects: cluster,
      alert: false,
      isTopic: true,
    });
  }
  return clusters;
}

// ── Budget / behavior similarity groups ───────────────────────────────────────
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
      usagePct, burnRate, daysLeft,
    };
  };

  const enriched = projects.map(p => ({ ...p, _cat: cat(p) }));
  const groups   = [];

  const budgetMeta = {
    small:  { icon: '🪙', label: 'תקציב קטן (עד ₪60k)',        statusLabel: 'נדרשת תשומת לב' },
    medium: { icon: '💵', label: 'תקציב בינוני (₪60k–₪350k)',   statusLabel: 'מצב יציב' },
    large:  { icon: '💰', label: 'תקציב גדול (מעל ₪350k)',       statusLabel: 'פוטנציאל גבוה' },
  };

  for (const tier of ['small','medium','large']) {
    const items = enriched.filter(p => p._cat.budgetTier === tier);
    if (items.length < 2) continue;
    const danger  = items.filter(p => (p.availableBalance ?? 0) < 0 || p._cat.usagePct >= 90).length;
    const warning = items.filter(p => { const a = p.availableBalance ?? 0; return a >= 0 && p._cat.usagePct >= 70 && p._cat.usagePct < 90; }).length;
    const { icon, label, statusLabel } = budgetMeta[tier];
    const healthNote = danger > 0 ? ` — ${danger} מחקרים בסיכון` : warning > 0 ? ` — ${warning} דורשים מעקב` : ' — ביצועים תקינים';
    groups.push({
      icon, alert: danger > 0,
      title: `${label} — ${statusLabel}`,
      insight: `${items.length} מחקרים בטווח תקציב דומה${healthNote}`,
      projects: items,
    });
  }

  const fast = enriched.filter(p => p._cat.burnTier === 'fast');
  if (fast.length >= 1)
    groups.push({ icon: '🔥', title: 'שריפת תקציב מהירה — דורש טיפול', alert: true, projects: fast,
      insight: `${fast.length} מחקרים מוציאים מהר מהצפוי — מועמדים לקבל העברת תקציב` });

  const slow = enriched.filter(p => p._cat.burnTier === 'slow');
  if (slow.length >= 1)
    groups.push({ icon: '🐢', title: 'שריפת תקציב איטית — יתרה צפויה', alert: false, projects: slow,
      insight: `${slow.length} מחקרים צפויים לסיים עם יתרה עודפת — מועמדים לתת העברת תקציב` });

  const urgent = enriched.filter(p => p._cat.timeTier === 'urgent');
  if (urgent.length >= 1)
    groups.push({ icon: '⚠️', title: 'קרובים לסיום — פחות מ-30 יום', alert: true, projects: urgent,
      insight: 'יש לטפל ביתרות עודפות בדחיפות לפני סגירת המחקר' });

  return groups;
}

function buildExplanation(giver, receiver) {
  const giverUsage = Math.round(giver.usagePct ?? 0);
  const recvUsage  = Math.round(receiver.usagePct ?? 0);

  // --- Why the giver has surplus ---
  let giverReason;
  if (giver.daysLeft !== null && giver.daysLeft <= 90)
    giverReason = `ניצל רק ${giverUsage}% מהתקציב ונותרו לו רק ${giver.daysLeft} ימים — כנראה לא ישתמש ביתרת ${fmt(giver.avail)}`;
  else if (giver.burnRate !== null && giver.burnRate < 0.75)
    giverReason = `ניצל רק ${giverUsage}% מהתקציב וקצב ההוצאות שלו נמוך מהצפוי (×${giver.burnRate.toFixed(2)}) — צפויה יתרה עודפת של ${fmt(giver.avail)}`;
  else
    giverReason = `ניצל ${giverUsage}% מהתקציב ויתרה זמינה של ${fmt(giver.avail)}`;

  // --- Why the receiver needs funds ---
  let recvReason;
  if (receiver.avail < 0)
    recvReason = `נמצא בגירעון של ${fmt(Math.abs(receiver.avail))} (ניצל ${recvUsage}% מהתקציב)`;
  else if (receiver.burnRate !== null && receiver.burnRate > 1.1)
    recvReason = `ניצל כבר ${recvUsage}% מהתקציב וקצב ההוצאות שלו גבוה מהצפוי (×${receiver.burnRate.toFixed(2)}) — צפוי לחרוג`;
  else
    recvReason = `ניצל ${recvUsage}% מהתקציב ועלול להגיע למחסור`;

  return `המקור ${giverReason}. היעד ${recvReason}.`;
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
    <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full ${colors[color] ?? colors.gray}`}>
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

function calcConfidence(giver, receiver) {
  let score = 0, max = 0;
  max += 2;
  if (giver.avail > (giver.budget || 0) * 0.25) score += 2;
  else if (giver.avail > (giver.budget || 0) * 0.15) score += 1;
  if (giver.burnRate !== null) { max += 2; if (giver.burnRate < 0.5) score += 2; else if (giver.burnRate < 0.75) score += 1; }
  if (giver.daysLeft !== null) { max += 2; if (giver.daysLeft > 90) score += 2; else if (giver.daysLeft > 45) score += 1; }
  max += 3;
  if (receiver.avail < 0) score += 3;
  else if (receiver.burnRate !== null && receiver.burnRate > 1.3) score += 2;
  else score += 1;
  return Math.round((score / max) * 100);
}

function RecommendationsSummary({ recommendations }) {
  const totalSurplus  = recommendations.reduce((s, r) => s + r.giver.avail, 0);
  const totalDeficit  = recommendations.reduce((s, r) => s + Math.abs(Math.min(r.receiver.avail, 0)), 0);
  const totalTransfer = recommendations.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-4" dir="rtl">
      <div>
        <p className="text-sm font-extrabold text-gray-800">🎯 נמצאו {recommendations.length} המלצות להעברת תקציב</p>
        <p className="text-xs text-gray-500 mt-0.5">ניתן לאזן תקציבים בין מחקרים ולהפחית גירעונות</p>
      </div>
      <div className="flex gap-5 flex-wrap">
        <div className="text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">סה"כ עודפים</p>
          <p className="text-sm font-extrabold text-green-700">{fmt(totalSurplus)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">סה"כ גירעונות</p>
          <p className="text-sm font-extrabold text-red-600">{fmt(totalDeficit)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">ניתן להעביר</p>
          <p className="text-sm font-extrabold text-primary">{fmt(totalTransfer)}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, onTransfer }) {
  const { giver, receiver, amount } = rec;
  const giverName  = giver.projectNameHe    || giver.projectNameEn    || `מחקר #${giver.projectId}`;
  const recvName   = receiver.projectNameHe || receiver.projectNameEn || `מחקר #${receiver.projectId}`;
  const giverUsage = Math.round(giver.usagePct ?? 0);
  const recvUsage  = Math.round(receiver.usagePct ?? 0);
  const confidence = calcConfidence(giver, receiver);
  const giverAfter = giver.avail - amount;
  const recvAfter  = receiver.avail + amount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
      <div className="h-1 bg-gradient-to-l from-primary to-accent" />

      <div className="p-5 space-y-4">

        {/* כותרת ראשית + ציון התאמה */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">💡 המלצה להעברת תקציב</p>
            <p className="text-base font-bold text-gray-900 leading-snug">
              מומלץ להעביר <span className="text-primary font-extrabold">{fmt(amount)}</span>{' '}
              מ<span className="text-green-700">"{giverName}"</span>{' '}
              אל <span className="text-red-600">"{recvName}"</span>
            </p>
          </div>
          <span className={`flex-shrink-0 text-sm font-bold px-2.5 py-1 rounded-full border ${
            confidence >= 80 ? 'bg-green-100 text-green-700 border-green-200'
            : confidence >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            {confidence >= 80 ? '🟢' : '🟡'} התאמה {confidence}%
          </span>
        </div>

        {/* שני המחקרים */}
        <div className="grid grid-cols-2 gap-3">
          {/* מקור */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1"><span>📤</span><span className="text-sm font-bold text-green-700 uppercase tracking-wider">מקור — יתרה עודפת</span></div>
            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{giverName}</p>
            {giver.principalResearcherName && <p className="text-sm text-gray-500">👤 {giver.principalResearcherName}</p>}
            <div className="space-y-1 pt-1.5 border-t border-green-200 text-sm">
              <p>✅ יתרה: <span className="font-bold text-green-700">{fmt(giver.avail)}</span></p>
              <p>✅ ניצול: <span className="font-bold text-green-700">{giverUsage}% בלבד</span></p>
              {giver.burnRate !== null && giver.burnRate < 0.75 && (
                <p>✅ קצב הוצאות: <span className="font-bold text-green-700">נמוך מהצפוי (×{giver.burnRate.toFixed(2)})</span></p>
              )}
              {giver.daysLeft !== null && (
                <p className={giver.daysLeft <= 60 ? 'text-amber-700' : 'text-gray-600'}>
                  {giver.daysLeft <= 60 ? '⚠️' : '✅'} נותרו {giver.daysLeft} ימים
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-0.5"><span>ניצול תקציב</span><span>{giverUsage}%</span></div>
              <div className="h-2 bg-white border border-green-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min(giverUsage, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* יעד */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1"><span>📥</span><span className="text-sm font-bold text-red-700 uppercase tracking-wider">יעד — זקוק לתקציב</span></div>
            <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{recvName}</p>
            {receiver.principalResearcherName && <p className="text-sm text-gray-500">👤 {receiver.principalResearcherName}</p>}
            <div className="space-y-1 pt-1.5 border-t border-red-200 text-sm">
              {receiver.avail < 0
                ? <p>🚨 גירעון: <span className="font-bold text-red-700">−{fmt(Math.abs(receiver.avail))}</span></p>
                : <p>⚠️ ניצול: <span className="font-bold text-amber-700">{recvUsage}%</span></p>
              }
              {receiver.burnRate !== null && receiver.burnRate > 1.1 && (
                <p>🔥 קצב הוצאות: <span className="font-bold text-red-700">גבוה מהצפוי (×{receiver.burnRate.toFixed(2)})</span></p>
              )}
              {receiver.daysLeft !== null && (
                <p className={receiver.daysLeft <= 60 ? 'text-red-600' : 'text-gray-600'}>
                  {receiver.daysLeft <= 60 ? '🚨' : '📅'} נותרו {receiver.daysLeft} ימים
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-0.5"><span>ניצול תקציב</span><span>{recvUsage}%</span></div>
              <div className="h-2 bg-white border border-red-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${receiver.avail < 0 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(recvUsage, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* סכום מומלץ */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl py-3 text-center">
          <p className="text-sm text-primary font-semibold mb-0.5">💸 סכום מומלץ להעברה</p>
          <p className="text-2xl font-extrabold text-primary leading-none">{fmt(amount)}</p>
        </div>

        {/* למה ההמלצה */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-bold text-blue-800 mb-1.5">🔍 למה קיבלתי את ההמלצה?</p>
          <p className="text-sm text-blue-700">• המקור מחזיק יתרה זמינה של {fmt(giver.avail)} ({giverUsage}% ניצול מתוך התקציב)</p>
          {giver.burnRate !== null && giver.burnRate < 0.75 && (
            <p className="text-sm text-blue-700">• קצב ההוצאות של המקור נמוך ב-{Math.round((1 - giver.burnRate) * 100)}% מהצפוי — צפויה יתרה עודפת</p>
          )}
          {receiver.avail < 0
            ? <p className="text-sm text-blue-700">• היעד בגירעון של {fmt(Math.abs(receiver.avail))} — נדרש תגבור מיידי</p>
            : <p className="text-sm text-blue-700">• היעד ניצל {recvUsage}% מהתקציב וצפוי לחרוג ממנו</p>
          }
          {receiver.burnRate !== null && receiver.burnRate > 1.1 && (
            <p className="text-sm text-blue-700">• קצב ההוצאות של היעד גבוה ב-{Math.round((receiver.burnRate - 1) * 100)}% מהצפוי</p>
          )}
        </div>

        {/* טבלת השפעה */}
        <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-600">📊 השפעת ההעברה</p>
          </div>
          <table className="w-full">
            <thead><tr className="text-sm text-gray-400 uppercase bg-gray-50">
              <th className="px-4 py-1.5 text-right font-semibold">מדד</th>
              <th className="px-4 py-1.5 text-center font-semibold">לפני</th>
              <th className="px-4 py-1.5 text-center font-semibold">אחרי</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-4 py-2 text-gray-600">יתרת המקור</td>
                <td className="px-4 py-2 text-center font-bold text-green-700">{fmt(giver.avail)}</td>
                <td className="px-4 py-2 text-center font-bold text-green-600">{fmt(giverAfter)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">{receiver.avail < 0 ? 'גירעון היעד' : 'יתרת היעד'}</td>
                <td className={`px-4 py-2 text-center font-bold ${receiver.avail < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {receiver.avail < 0 ? `−${fmt(Math.abs(receiver.avail))}` : fmt(receiver.avail)}
                </td>
                <td className={`px-4 py-2 text-center font-bold ${recvAfter < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {recvAfter < 0 ? `−${fmt(Math.abs(recvAfter))}` : fmt(recvAfter)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* כפתור */}
        <button
          onClick={() => onTransfer(giver.projectId, receiver.projectId, amount)}
          className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          💸 התחל תהליך העברה
        </button>
      </div>
    </div>
  );
}

function OverallStatusSummary({ projects }) {
  const stats = projects.reduce((acc, p) => {
    const avail    = p.availableBalance ?? 0;
    const budget   = p.totalBudget ?? 0;
    const paid     = p.totalPaid ?? 0;
    const usagePct = budget > 0 ? Math.round((paid / budget) * 100) : 0;
    const timePct  = calcTimePct(p);
    const burnRate = (timePct && timePct > 0) ? (usagePct / timePct) : null;
    const health   =
      avail < 0 || usagePct >= 90 ? 'danger'
      : usagePct >= 70 || (burnRate !== null && burnRate > 1.1) ? 'warning'
      : 'good';
    acc[health]++;
    if (avail > 0) acc.surplus += avail;
    if (avail < 0) acc.deficit += Math.abs(avail);
    return acc;
  }, { good: 0, warning: 0, danger: 0, surplus: 0, deficit: 0 });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm" dir="rtl">
      <p className="text-sm font-extrabold text-gray-800 mb-3">📊 תמונת מצב כללית</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-extrabold text-gray-800">{projects.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">מחקרים נותחו</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-extrabold text-green-700">{stats.good}</p>
          <p className="text-sm text-green-600 mt-0.5">🟢 מצב תקין</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-extrabold text-amber-700">{stats.warning}</p>
          <p className="text-sm text-amber-600 mt-0.5">🟡 דורשים מעקב</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-extrabold text-red-700">{stats.danger}</p>
          <p className="text-sm text-red-600 mt-0.5">🔴 דורשים טיפול</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-blue-50 rounded-xl p-3 text-center space-y-1">
          <p className="text-sm font-extrabold text-green-700">💰 {fmt(stats.surplus)}</p>
          <p className="text-xs text-gray-400">סך יתרות</p>
          <p className="text-sm font-extrabold text-red-600">⚠️ {fmt(stats.deficit)}</p>
          <p className="text-xs text-gray-400">סך גירעונות</p>
        </div>
      </div>
    </div>
  );
}

function ProjectHealthCard({ p, navigate }) {
  const avail     = p.availableBalance ?? 0;
  const budget    = p.totalBudget ?? 0;
  const usagePct  = budget > 0 ? Math.min(Math.round(((p.totalPaid ?? 0) / budget) * 100), 100) : 0;
  const daysLeft  = calcDaysLeft(p);
  const timePct   = calcTimePct(p);
  const burnRate  = (timePct && timePct > 0) ? (usagePct / timePct) : null;
  const isDeficit = avail < 0;

  const health =
    isDeficit || usagePct >= 90 ? 'danger'
    : usagePct >= 70             ? 'warning'
    :                              'good';

  const borderColor = health === 'danger' ? 'border-red-300' : health === 'warning' ? 'border-amber-300' : 'border-green-200';
  const barColor    = health === 'danger' ? 'bg-red-500'     : health === 'warning' ? 'bg-amber-400'     : 'bg-green-500';
  const badgeCls    = health === 'danger' ? 'bg-red-100 text-red-700 border-red-200'
                    : health === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200'
                    :                        'bg-green-100 text-green-700 border-green-200';
  const statusIcon  = health === 'danger' ? '🚨' : health === 'warning' ? '⚠️' : '✅';

  const warningReason =
    isDeficit                                          ? `חריגה מהתקציב המאושר (גירעון ${fmt(Math.abs(avail))})` :
    usagePct >= 90                                     ? `ניצול תקציב קריטי — ${usagePct}% נוצל` :
    usagePct >= 70 && burnRate !== null && burnRate > 1.1 ? `ניצול גבוה (${usagePct}%) וקצב הוצאות מהיר` :
    daysLeft !== null && daysLeft <= 30                ? `${daysLeft} ימים בלבד לסיום המחקר` :
    null;

  return (
    <button
      onClick={() => navigate(`/projects/${p.projectId}`)}
      className={`text-right bg-white hover:bg-gray-50 border ${borderColor} rounded-xl p-3.5 transition-all group flex flex-col gap-2 w-full`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-800 leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`}
        </p>
        <span className={`flex-shrink-0 text-sm font-bold px-1.5 py-0.5 rounded-full border ${badgeCls}`} title="ניצול תקציב">
          {usagePct}%
        </span>
      </div>

      {/* פס עם תווית */}
      <div>
        <p className="text-sm text-gray-400 mb-0.5">ניצול תקציב</p>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${usagePct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{statusIcon}</span>
        <p className={`text-sm font-extrabold ${isDeficit ? 'text-red-600' : 'text-green-700'}`}>
          {isDeficit ? `גירעון ${fmt(Math.abs(avail))}` : `יתרה ${fmt(avail)}`}
        </p>
      </div>

      {daysLeft !== null && (
        <p className={`text-sm font-medium ${daysLeft <= 30 ? 'text-red-600' : daysLeft <= 90 ? 'text-amber-600' : 'text-gray-400'}`}>
          📅 {daysLeft} ימים לסיום
        </p>
      )}

      {warningReason && health !== 'good' && (
        <p className={`text-sm rounded-lg px-2 py-1 ${health === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
          סיבת האזהרה: {warningReason}
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
            <h3 className="text-base font-bold text-gray-800">{group.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{group.insight}</p>
          </div>
        </div>
        {/* סיכום בריאות הקבוצה */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
          {dangerCount > 0 && (
            <span className="text-sm font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              🚨 {dangerCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-sm font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              ⚠️ {warningCount}
            </span>
          )}
          <span className="text-sm font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
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
  const [projects,      setProjects]      = useState([]);
  const [myProjectIds,  setMyProjectIds]  = useState(new Set());
  const [loading,       setLoading]       = useState(true);
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
    Promise.all([getAllProjects(), getProjects()])
      .then(([allRes, myRes]) => {
        setProjects((allRes.data ?? []).filter(isActive));
        setMyProjectIds(new Set((myRes.data ?? []).map(p => p.projectId)));
      })
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
  const recommendations   = useMemo(() => buildTransferRecommendations(projects, myProjectIds), [projects, myProjectIds]);
  const similarityGroups  = useMemo(() => buildSimilarityGroups(projects), [projects]);
  const topicGroups       = useMemo(() => buildTopicGroups(projects), [projects]);

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
                  <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none px-1">
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
                <>
                  <RecommendationsSummary recommendations={recommendations} />
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
                </>
              )}
            </div>

            {/* תמונת מצב כללית */}
            {!loading && projects.length > 0 && <OverallStatusSummary projects={projects} />}

            {/* מקרא צבעים */}
            <div className="flex flex-wrap gap-3 mb-5 text-xs">
              <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-semibold px-3 py-1.5 rounded-full">🟢 מצב תקין — ניצול תקין וקצב הוצאות סביר</span>
              <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-3 py-1.5 rounded-full">🟡 דורש מעקב — ניצול גבוה או קצב מהיר</span>
              <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 font-semibold px-3 py-1.5 rounded-full">🔴 דורש טיפול — גירעון או ניצול קריטי</span>
            </div>

            {/* מחקרים דומים בנושא */}
            {!loading && topicGroups.length > 0 && (
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl mt-0.5">🧬</span>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">מחקרים דומים בנושא המחקר</h2>
                    <p className="text-sm text-gray-400 mt-0.5">קיבוץ לפי מילות מפתח משותפות בשם המחקר</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {topicGroups.map((group, i) => (
                    <SimilarityGroupCard key={i} group={group} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

            {/* קיבוץ לפי תקציב והתנהגות */}
            <div>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl mt-0.5">🔗</span>
                <div>
                  <h2 className="text-base font-extrabold text-gray-800">קיבוץ לפי תקציב והתנהגות פיננסית</h2>
                  <p className="text-sm text-gray-400 mt-0.5">גודל תקציב, קצב הוצאות ולוח זמנים — לזיהוי דפוסים משותפים</p>
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
                                  <span className="text-xs sm:text-xs font-semibold text-gray-600 leading-tight">{label}</span>
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
                                        <span className={`text-xs sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full ${v.badge.cls}`}>
                                          {v.badge.text}
                                        </span>
                                      )}
                                    </div>
                                    {v.sub && <p className="text-xs sm:text-xs text-gray-400 mt-0.5">{v.sub}</p>}
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