import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMySubmissions, getHourReports } from '../api/hourReportsApi';
import Layout from '../components/Layout';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];


const STATUS_STYLES = {
  'אושר':  { badge: 'bg-green-100 text-green-700 ring-1 ring-green-200',   row: 'border-r-4 border-green-400' },
  'נדחה':  { badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',         row: 'border-r-4 border-red-400' },
  'ממתין': { badge: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200', row: 'border-r-4 border-yellow-400' },
};

const STATUS_ICONS = { 'אושר': '✅', 'נדחה': '❌', 'ממתין': '⏳' };

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status]?.badge ?? 'bg-gray-100 text-gray-600';
  const icon = STATUS_ICONS[status] ?? '';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${style}`}>
      <span>{icon}</span>
      {status}
    </span>
  );
}

function parseDayFromDate(dateStr) {
  if (!dateStr) return null;
  return parseInt(String(dateStr).slice(8, 10), 10);
}

function DayReportsTable({ userId, projectId, month, year }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    getHourReports(userId, projectId, month, year)
      .then((r) => setRows(r.data ?? []))
      .catch(() => setRows([]));
  }, [userId, projectId, month, year]);

  if (rows === null) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">אין רשומות יומיות</p>;
  }

  const total = rows.reduce((sum, r) => sum + (r.workedHours ? Number(r.workedHours) : 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs">
            <th className="px-4 py-2 text-right font-medium">יום</th>
            <th className="px-4 py-2 text-right font-medium">משעה</th>
            <th className="px-4 py-2 text-right font-medium">עד שעה</th>
            <th className="px-4 py-2 text-right font-medium">שעות</th>
            <th className="px-4 py-2 text-right font-medium">הערות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const day = parseDayFromDate(r.reportDate);
            const dayOfWeek = day ? new Date(year, month - 1, day).getDay() : null;
            return (
              <tr key={r.hourReportId} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {day}
                  {dayOfWeek !== null && (
                    <span className="text-gray-400 text-xs mr-1.5">({DAY_NAMES[dayOfWeek]})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                  {r.fromHour ? String(r.fromHour).slice(0, 5) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                  {r.toHour ? String(r.toHour).slice(0, 5) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-800 font-semibold tabular-nums">
                  {r.workedHours != null ? Number(r.workedHours).toFixed(1) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{r.comments || ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold text-gray-700">
            <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">סה"כ</td>
            <td className="px-4 py-2 tabular-nums">{total.toFixed(1)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function MyReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMySubmissions(user.userId)
      .then((r) => setSubmissions(r.data ?? []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Unique projects from submissions
  const projects = Object.values(
    submissions.reduce((acc, s) => {
      const key = s.projectId ?? 0;
      if (!acc[key]) acc[key] = { projectId: key, name: s.projectNameHe || `מחקר ${key}` };
      return acc;
    }, {})
  );

  const filtered = submissions.filter((s) => {
    const matchStatus  = statusFilter === 'all' || s.approvalStatus === statusFilter;
    const matchProject = projectFilter === 'all' || String(s.projectId) === projectFilter;
    return matchStatus && matchProject;
  });

  // Count badges — reflect the current project filter
  const counts = filtered.reduce((acc, s) => {
    acc[s.approvalStatus] = (acc[s.approvalStatus] ?? 0) + 1;
    return acc;
  }, {});

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" dir="rtl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">הדוחות שלי</h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.firstName} {user?.lastName} — כל הדוחות החודשיים שנשלחו לאישור
            </p>
          </div>
          <button
            onClick={() => navigate('/attendance')}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            חזרה לדיווח נוכחות
          </button>
        </div>

        {/* Summary cards — also serve as status filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'all'
                ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            הכל ({submissions.length})
          </button>
          {[
            { label: 'ממתין לאישור', status: 'ממתין', icon: '⏳', bg: 'linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)', border: 'border-yellow-200', ring: 'ring-yellow-300', num: 'text-yellow-700' },
            { label: 'אושרו',        status: 'אושר',  icon: '✅', bg: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)', border: 'border-green-200',  ring: 'ring-green-300',  num: 'text-green-700' },
            { label: 'נדחו',         status: 'נדחה',  icon: '❌', bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', border: 'border-red-200',    ring: 'ring-red-300',    num: 'text-red-700' },
          ].map(({ label, status, icon, bg, border, ring, num }) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter((prev) => prev === status ? 'all' : status)}
                style={{ background: bg }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${border} ${active ? `ring-2 ${ring} shadow-sm` : 'hover:shadow-sm'}`}
              >
                <span>{icon}</span>
                <span className={num}>{counts[status] ?? 0}</span>
                <span className="text-gray-600">{label}</span>
              </button>
            );
          })}

          {/* Project filter — only when user has multiple projects */}
          {projects.length > 1 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="mr-auto border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
            >
              <option value="all">כל המחקרים</option>
              {projects.map((p) => (
                <option key={p.projectId} value={String(p.projectId)}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-400">
              {submissions.length === 0 ? 'טרם נשלחו דוחות' : 'אין דוחות התואמים לסינון הנבחר'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isExpanded = expandedId === s.monthlyApprovalId;
              const styles = STATUS_STYLES[s.approvalStatus] ?? {};
              return (
                <div
                  key={s.monthlyApprovalId}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${styles.row ?? ''}`}
                >
                  {/* Row header */}
                  <button
                    onClick={() => toggleExpand(s.monthlyApprovalId)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors text-right"
                  >
                    {/* RIGHT: month + year + project */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">
                        {MONTH_NAMES[(s.month ?? 1) - 1]} {s.year}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.projectNameHe || `מחקר ${s.projectId}`}
                      </p>
                    </div>

                    {/* LEFT: status + hours + chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={s.approvalStatus} />
                      {s.totalWorkedHours != null && (
                        <span className="text-sm font-bold text-gray-700 tabular-nums">
                          {Number(s.totalWorkedHours).toFixed(1)}
                          <span className="text-xs font-normal text-gray-400 mr-0.5">שעות</span>
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : '-rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Rejection comment */}
                  {s.approvalStatus === 'נדחה' && s.comments && (
                    <div className="px-5 pb-3">
                      <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-700">
                        <span className="font-medium">סיבת הדחייה: </span>{s.comments}
                      </div>
                    </div>
                  )}

                  {/* Expanded day-level detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <DayReportsTable
                        userId={user.userId}
                        projectId={s.projectId}
                        month={s.month}
                        year={s.year}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
