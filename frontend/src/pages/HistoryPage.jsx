import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { getAuditLogs } from '../api/auditApi';
import { getProjects } from '../api/projectsApi';

// ── Action metadata ────────────────────────────────────────────────────────────
const ACTION_META = {
  project_created:          { label: 'יצירת מחקר',                 category: 'project',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  project_updated:          { label: 'עדכון נתוני מחקר',            category: 'project',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  project_archived:         { label: 'ארכוב מחקר',                  category: 'project',  color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  project_restored:         { label: 'שחזור מחקר',                  category: 'project',  color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  team_member_added:        { label: 'הוספת חבר צוות',              category: 'team',     color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  team_member_removed:      { label: 'הסרת חבר צוות',              category: 'team',     color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  assistant_added:          { label: 'הוספת עוזר מחקר',             category: 'team',     color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  assistant_removed:        { label: 'הסרת עוזר מחקר',             category: 'team',     color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  assistant_created:        { label: 'יצירת עוזר מחקר',             category: 'team',     color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-600' },
  assistant_updated:        { label: 'עדכון עוזר מחקר',             category: 'team',     color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  payment_request_created:  { label: 'בקשת תשלום חדשה',             category: 'payment',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  payment_approved:         { label: 'אישור תשלום',                  category: 'payment',  color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  payment_rejected:         { label: 'דחיית תשלום',                  category: 'payment',  color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  payment_paid:             { label: 'תשלום בוצע',                   category: 'payment',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  payment_status_updated:   { label: 'עדכון סטטוס תשלום',            category: 'payment',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  hour_report_submitted:    { label: 'הגשת דוח שעות',               category: 'hours',    color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  hour_report_approved:     { label: 'אישור דוח שעות',               category: 'hours',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  hour_report_rejected:     { label: 'דחיית דוח שעות',               category: 'hours',    color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  budget_transferred:       { label: 'העברת תקציב',                  category: 'budget',   color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-500' },
  budget_categories_updated:{ label: 'עדכון קטגוריות תקציב',        category: 'budget',   color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-400' },
  commitment_added:         { label: 'הוספת התחייבות',               category: 'budget',   color: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-500' },
  commitment_updated:       { label: 'עדכון התחייבות',               category: 'budget',   color: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-400' },
  commitment_deleted:       { label: 'מחיקת התחייבות',               category: 'budget',   color: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-300' },
  file_uploaded:            { label: 'העלאת קובץ',                   category: 'files',    color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  file_deleted:             { label: 'מחיקת קובץ',                   category: 'files',    color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
};

const CATEGORIES = [
  { value: 'all',     label: 'הכל' },
  { value: 'project', label: 'מחקר' },
  { value: 'team',    label: 'צוות' },
  { value: 'payment', label: 'תשלומים' },
  { value: 'hours',   label: 'דוחות שעות' },
  { value: 'budget',  label: 'תקציב' },
  { value: 'files',   label: 'קבצים' },
];

const CATEGORY_COLORS = {
  all:     'bg-gray-100 text-gray-700 border-gray-200',
  project: 'bg-blue-50 text-blue-700 border-blue-200',
  team:    'bg-purple-50 text-purple-700 border-purple-200',
  payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  hours:   'bg-orange-50 text-orange-700 border-orange-200',
  budget:  'bg-teal-50 text-teal-700 border-teal-200',
  files:   'bg-slate-50 text-slate-600 border-slate-200',
};

function getActionMeta(actionType) {
  return ACTION_META[actionType] ?? {
    label: actionType,
    category: 'other',
    color: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── Icons ────────────────────────────────────────────────────────────────────
const IconProject  = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconTeam     = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconPayment  = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const IconHours    = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconBudget   = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconFile     = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;

const CATEGORY_ICONS = { project: IconProject, team: IconTeam, payment: IconPayment, hours: IconHours, budget: IconBudget, files: IconFile };

// ── Excel export ─────────────────────────────────────────────────────────────
function exportToExcel(logs, projectName) {
  const rows = logs.map(log => ({
    'תאריך ושעה':       formatDateTime(log.createdAt),
    'מבצע הפעולה':      log.performedByName || log.performedByUserId,
    'מזהה משתמש':       log.performedByUserId,
    'סוג פעולה':        getActionMeta(log.actionType).label,
    'תיאור הפעולה':     log.actionDescription,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // RTL direction
  ws['!sheetViews'] = [{ rightToLeft: true }];

  // Column widths
  ws['!cols'] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'היסטוריית שינויים');

  const safeProjectName = (projectName || 'מחקר').replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `היסטוריית_שינויים_${safeProjectName}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [projects, setProjects]         = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [logs, setLogs]                 = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLogs, setLoadingLogs]   = useState(false);
  const [logsError, setLogsError]       = useState(false);
  const [category, setCategory]         = useState('all');
  const [search, setSearch]             = useState('');

  // Load projects
  useEffect(() => {
    getProjects()
      .then(res => {
        setProjects(res.data ?? []);
        if (res.data?.length > 0) setSelectedProjectId(String(res.data[0].projectId));
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  // Load logs when project changes
  useEffect(() => {
    if (!selectedProjectId) { setLogs([]); return; }
    setLoadingLogs(true);
    setLogsError(false);
    setCategory('all');
    setSearch('');
    getAuditLogs(selectedProjectId)
      .then(res => setLogs(res.data ?? []))
      .catch(() => { setLogs([]); setLogsError(true); })
      .finally(() => setLoadingLogs(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => String(p.projectId) === selectedProjectId);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: logs.length };
    for (const log of logs) {
      const cat = getActionMeta(log.actionType).category;
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  // Filter
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (category !== 'all')
      result = result.filter(l => getActionMeta(l.actionType).category === category);
    if (search.trim())
      result = result.filter(l =>
        l.actionDescription?.includes(search) ||
        l.performedByName?.includes(search) ||
        l.performedByUserId?.includes(search)
      );
    return result;
  }, [logs, category, search]);

  return (
    <Layout>
      <div dir="rtl">
        {/* ── Header ── */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">היסטוריית שינויים</h1>
            <p className="text-sm text-gray-400 mt-0.5">מעקב אחר כלל הפעולות שבוצעו בכל מחקר</p>
          </div>

          {/* Export button */}
          {filteredLogs.length > 0 && (
            <button
              onClick={() => exportToExcel(filteredLogs, selectedProject?.projectNameHe)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ייצוא לאקסל
            </button>
          )}
        </div>

        {/* ── Project selector ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            בחר מחקר
          </label>
          {loadingProjects ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-400">לא נמצאו מחקרים</p>
          ) : (
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="input-field"
            >
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Category filter chips ── */}
        {!loadingLogs && logs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat.value] ?? 0;
              const isActive = category === cat.value;
              const CatIcon = CATEGORY_ICONS[cat.value];
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? `${CATEGORY_COLORS[cat.value] ?? 'bg-gray-100 text-gray-700 border-gray-200'} shadow-sm`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {CatIcon && <CatIcon />}
                  {cat.label}
                  {count > 0 && (
                    <span className={`mr-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                      isActive ? 'bg-white/60' : 'bg-gray-100'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search ── */}
        {!loadingLogs && logs.length > 0 && (
          <div className="relative mb-4">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="חיפוש לפי תיאור, שם משתמש או מזהה..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            />
          </div>
        )}

        {/* ── Content ── */}
        {!selectedProjectId ? (
          <EmptyState icon="project" message="בחר מחקר להצגת ההיסטוריה" />
        ) : loadingLogs ? (
          <LoadingSkeleton />
        ) : logsError ? (
          <EmptyState icon="empty" message="שגיאה בטעינת ההיסטוריה — ודא שהשרת פועל ונסה שוב" />
        ) : logs.length === 0 ? (
          <EmptyState icon="empty" message="לא נמצאו רשומות עבור מחקר זה — בצע פעולות כלשהן ובדוק שוב" />
        ) : filteredLogs.length === 0 ? (
          <EmptyState icon="search" message="לא נמצאו תוצאות לחיפוש" />
        ) : (
          <>
            {/* Results count */}
            <p className="text-xs text-gray-400 mb-3">
              מציג {filteredLogs.length} מתוך {logs.length} פעולות
            </p>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredLogs.map((log, idx) => {
                  const meta = getActionMeta(log.actionType);
                  return (
                    <LogRow key={log.id ?? idx} log={log} meta={meta} />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function LogRow({ log, meta }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
      {/* Dot */}
      <div className="flex-shrink-0 mt-1">
        <span className={`block w-2.5 h-2.5 rounded-full ring-2 ring-white ${meta.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {/* Action type badge */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {/* User badge */}
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {log.performedByName || log.performedByUserId}
          </span>
        </div>
        {/* Description */}
        <p className="text-sm text-gray-800 leading-relaxed">{log.actionDescription}</p>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-left">
        <p className="text-xs text-gray-400 whitespace-nowrap">{formatDateShort(log.createdAt)}</p>
        <p className="text-xs text-gray-400 whitespace-nowrap text-left">
          {new Date(log.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  const icons = {
    project: <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    empty:   <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    search:  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icons[icon]}
      <p className="mt-4 text-sm text-gray-400">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-5 w-32 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex-shrink-0 space-y-1">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
