import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { getProjects } from '../api/projectsApi';
import Layout from '../components/Layout';

const TODAY = new Date().toISOString().split('T')[0];

const fmt = (v) => `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(v)}`;

const isActive = (p) => {
  const active = p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';
  return active && (!p.endDate || String(p.endDate).slice(0, 10) >= TODAY);
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-right" dir="rtl">
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function ComparisonPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [metric, setMetric]     = useState('all'); // 'all' | 'budget' | 'paid' | 'available'

  const load = useCallback(() => {
    setLoading(true);
    getProjects()
      .then((res) => setProjects((res.data ?? []).filter(isActive)))
      .catch(() => toast.error('שגיאה בטעינת הנתונים'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = projects.map((p) => ({
    name: (p.projectNameHe || p.projectNameEn || `#${p.projectId}`).slice(0, 16),
    'תקציב כולל':  p.totalBudget     ?? 0,
    'שולם':         p.totalPaid       ?? 0,
    'יתרה זמינה':  p.availableBalance ?? 0,
  }));

  const METRICS = [
    { key: 'all',       label: 'הכל' },
    { key: 'budget',    label: 'תקציב כולל' },
    { key: 'paid',      label: 'שולם' },
    { key: 'available', label: 'יתרה זמינה' },
  ];

  const showBudget    = metric === 'all' || metric === 'budget';
  const showPaid      = metric === 'all' || metric === 'paid';
  const showAvailable = metric === 'all' || metric === 'available';

  return (
    <Layout>
      <div dir="rtl">
        {/* Header */}
        <div className="mb-6 text-right">
          <h1 className="text-2xl font-bold text-gray-900">השוואות בין מחקרים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} מחקרים פעילים</p>
        </div>

        {/* Chart card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    metric === m.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <h2 className="text-sm font-semibold text-gray-700">השוואת תקציב בין מחקרים פעילים</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-gray-400 py-20 text-sm">אין מחקרים פעילים להצגה</p>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '16px' }} />
                {showBudget    && <Bar dataKey="תקציב כולל" fill="#93c5fd" radius={[4, 4, 0, 0]} />}
                {showPaid      && <Bar dataKey="שולם"        fill="#f87171" radius={[4, 4, 0, 0]} />}
                {showAvailable && <Bar dataKey="יתרה זמינה"  fill="#4ade80" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-project table */}
        {!loading && projects.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-5 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 text-right">
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
                    const paid    = p.totalPaid ?? 0;
                    const avail   = p.availableBalance ?? 0;
                    const usedPct = budget > 0 ? Math.round((paid / budget) * 100) : 0;
                    const color   = usedPct >= 90 ? 'text-red-600' : usedPct >= 70 ? 'text-amber-600' : 'text-green-700';
                    return (
                      <tr key={p.projectId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800 max-w-[200px] truncate">
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
      </div>
    </Layout>
  );
}
