import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getProjects, getCommitments } from '../api/projectsApi';
import { getPaymentRequestsByProject } from '../api/paymentRequestsApi';
import Layout from '../components/Layout';

const TODAY    = new Date().toISOString().split('T')[0];
const TODAY_MS = Date.now();

const fmt  = (v) => `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(v ?? 0)}`;
const fmtK = (v) => {
  if (v == null || v === 0) return '₪0';
  if (Math.abs(v) >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `₪${(v / 1000).toFixed(0)}k`;
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
      label: 'סה״כ שולם', icon: '💸',
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

function CustomXTick({ x, y, payload }) {
  const full = payload.value;
  const display = full.length > 22 ? full.slice(0,21)+'…' : full;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#374151" fontSize={12} transform="rotate(-55)">{display}</text>
    </g>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-right" dir="rtl">
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((e) => (
        <p key={e.name} className="text-xs mt-0.5" style={{ color: e.color }}>{e.name}: {fmt(e.value)}</p>
      ))}
    </div>
  );
}

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [metric,      setMetric]      = useState('all');
  const [mode,        setMode]        = useState('overview');
  const [selectedIds, setSelectedIds] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [loadingCmp,  setLoadingCmp]  = useState(false);
  const [period,      setPeriod]      = useState('monthly');

  const load = useCallback(() => {
    setLoading(true);
    getProjects()
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
    'תקציב כולל': p.totalBudget      ?? 0,
    'שולם':        p.totalPaid        ?? 0,
    'יתרה זמינה': p.availableBalance ?? 0,
  }));

  const METRICS = [
    { key: 'all',       label: 'הכל' },
    { key: 'budget',    label: 'תקציב כולל' },
    { key: 'paid',      label: 'שולם' },
    { key: 'available', label: 'יתרה זמינה' },
  ];

  const PERIODS = [
    { key: 'monthly',   label: 'חודשי' },
    { key: 'quarterly', label: 'רבעוני' },
    { key: 'yearly',    label: 'שנתי' },
  ];

  const selectedProjects = selectedIds.map(id => projects.find(p => p.projectId === id)).filter(Boolean);
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
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">השוואות בין מחקרים</h1>
            <p className="text-sm text-gray-400 mt-0.5">{projects.length} מחקרים פעילים</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[{ key: 'overview', label: 'סקירה כללית' }, { key: 'compare', label: '⚖️ השוואה ישירה' }].map((m) => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m.label}
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
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={chartData} margin={{ top: 4, right: 10, left: 10, bottom: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={<CustomXTick />} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: '16px' }} />
                    {(metric==='all'||metric==='budget')    && <Bar dataKey="תקציב כולל" fill="#93c5fd" radius={[4,4,0,0]} />}
                    {(metric==='all'||metric==='paid')      && <Bar dataKey="שולם"        fill="#f87171" radius={[4,4,0,0]} />}
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
                        <th className="px-4 py-3 text-left font-semibold">שולם</th>
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

        {mode === 'compare' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-700">בחר מחקרים להשוואה</h2>
                <div className="flex items-center gap-3">
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
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {projects.map((p) => {
                    const idx = selectedIds.indexOf(p.projectId);
                    const selected = idx !== -1;
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <button key={p.projectId} onClick={() => toggleSelect(p.projectId)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          selected
                            ? 'text-white border-transparent shadow-sm'
                            : 'text-gray-600 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                        style={selected ? { backgroundColor: color, borderColor: color } : {}}>
                        {selected && (
                          <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span className="truncate max-w-[180px]">
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                  <div className="overflow-x-auto">
                    <table className="text-sm" dir="rtl"
                      style={{ minWidth: `${180 + selectedProjects.length * 160}px`, width: '100%' }}>
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <th className="px-5 py-4 text-right sticky right-0 z-10 bg-gray-50 w-44 border-l border-gray-100">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">פרמטר</span>
                          </th>
                          {selectedProjects.map((p, i) => (
                            <th key={p.projectId}
                              className="px-4 py-4 text-right border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50/70"
                              onClick={() => navigate(`/projects/${p.projectId}`)}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-sm font-bold text-gray-800 truncate max-w-[130px]" title={p.projectNameHe}>
                                  {p.projectNameHe || p.projectNameEn || `#${p.projectId}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-primary font-medium mt-0.5 mr-5">פתח מחקר ←</p>
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
                              <td className="px-5 py-4 sticky right-0 bg-white border-l border-gray-50 z-10 w-44">
                                <div className="flex items-center gap-2">
                                  <span className="text-base leading-none">{icon}</span>
                                  <span className="text-xs font-semibold text-gray-600">{label}</span>
                                </div>
                              </td>
                              {values.map((v, i) => {
                                const color = COLORS[i % COLORS.length];
                                const pct   = max > 0 ? (v.raw / max) * 100 : 0;
                                return (
                                  <td key={i} className="px-4 py-4 border-r border-gray-50 last:border-r-0 align-top min-w-[160px]">
                                    <div className="flex items-start gap-1.5 flex-wrap">
                                      <p className="text-base font-extrabold tabular-nums leading-tight" style={{ color }}>
                                        {v.display}
                                      </p>
                                      {v.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.badge.cls}`}>
                                          {v.badge.text}
                                        </span>
                                      )}
                                    </div>
                                    {v.sub && <p className="text-[11px] text-gray-400 mt-0.5">{v.sub}</p>}
                                    {max > 0 && (
                                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700"
                                          style={{ width: `${Math.min(pct,100)}%`, backgroundColor: color }} />
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h2 className="text-sm font-semibold text-gray-700">הוצאות לאורך זמן</h2>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
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
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData} margin={{ top: 4, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v, name) => [fmt(v), name]}
                          contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '12px' }} />
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