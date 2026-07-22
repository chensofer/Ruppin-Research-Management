import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getAuditLogs } from '../../api/auditApi';

const ACTION_META = {
  project_created:           { label: 'יצירת מחקר',              category: 'project',  color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  project_updated:           { label: 'עדכון נתוני מחקר',         category: 'project',  color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  project_archived:          { label: 'ארכוב מחקר',               category: 'project',  color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
  project_restored:          { label: 'שחזור מחקר',               category: 'project',  color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  team_member_added:         { label: 'הוספת חבר צוות',           category: 'team',     color: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500' },
  team_member_removed:       { label: 'הסרת חבר צוות',            category: 'team',     color: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-400' },
  assistant_added:           { label: 'הוספת עוזר מחקר',          category: 'team',     color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
  assistant_removed:         { label: 'הסרת עוזר מחקר',           category: 'team',     color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400' },
  assistant_created:         { label: 'יצירת עוזר מחקר',          category: 'team',     color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-600' },
  assistant_updated:         { label: 'עדכון עוזר מחקר',          category: 'team',     color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400' },
  payment_request_created:   { label: 'בקשת תשלום חדשה',          category: 'payment',  color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-500' },
  payment_approved:          { label: 'אישור תשלום',               category: 'payment',  color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  payment_rejected:          { label: 'דחיית תשלום',               category: 'payment',  color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  payment_paid:              { label: 'תשלום בוצע',                category: 'payment',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  payment_status_updated:    { label: 'עדכון סטטוס תשלום',         category: 'payment',  color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-400' },
  hour_report_submitted:     { label: 'הגשת דוח שעות',            category: 'hours',    color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  hour_report_approved:      { label: 'אישור דוח שעות',            category: 'hours',    color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  hour_report_rejected:      { label: 'דחיית דוח שעות',            category: 'hours',    color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  budget_transferred:        { label: 'העברת תקציב',               category: 'budget',   color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  budget_categories_updated: { label: 'עדכון קטגוריות תקציב',      category: 'budget',   color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-400' },
  commitment_added:          { label: 'הוספת התחייבות',            category: 'budget',   color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-500' },
  commitment_updated:        { label: 'עדכון התחייבות',            category: 'budget',   color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-400' },
  commitment_deleted:        { label: 'מחיקת התחייבות',            category: 'budget',   color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-300' },
  file_uploaded:             { label: 'העלאת קובץ',                category: 'files',    color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
  file_deleted:              { label: 'מחיקת קובץ',                category: 'files',    color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
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

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function exportToExcel(logs, projectName) {
  const rows = logs.map(log => ({
    'תאריך ושעה':   formatDateTime(log.createdAt),
    'מבצע הפעולה':  log.performedByName || log.performedByUserId,
    'מזהה משתמש':   log.performedByUserId,
    'סוג פעולה':    getActionMeta(log.actionType).label,
    'תיאור הפעולה': log.actionDescription,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!sheetViews'] = [{ rightToLeft: true }];
  ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'היסטוריית שינויים');
  const safeName = (projectName || 'מחקר').replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `היסטוריית_שינויים_${safeName}.xlsx`);
}

export default function TabHistory({ projectId, projectName }) {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(false);
    getAuditLogs(projectId)
      .then(res => setLogs(res.data ?? []))
      .catch(() => { setLogs([]); setError(true); })
      .finally(() => setLoading(false));
  }, [projectId]);

  const categoryCounts = useMemo(() => {
    const counts = { all: logs.length };
    for (const log of logs) {
      const cat = getActionMeta(log.actionType).category;
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (category !== 'all')
      result = result.filter(l => getActionMeta(l.actionType).category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(l =>
        l.actionDescription?.toLowerCase().includes(q) ||
        l.performedByName?.toLowerCase().includes(q) ||
        l.performedByUserId?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, category, search]);

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">היסטוריית שינויים</h2>
          <p className="text-sm text-gray-400 mt-0.5">כלל הפעולות שבוצעו במחקר זה</p>
        </div>
      </div>

      {/* Category filter chips */}
      {!loading && !error && logs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map(cat => {
            const count = categoryCounts[cat.value] ?? 0;
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  isActive
                    ? `${CATEGORY_COLORS[cat.value] ?? 'bg-gray-100 text-gray-700 border-gray-200'} shadow-sm`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`mr-0.5 px-1.5 py-0.5 rounded-full text-sm leading-none ${
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

      {/* Search */}
      {!loading && !error && logs.length > 0 && (
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

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <EmptyState icon="empty" message="שגיאה בטעינת ההיסטוריה — ודא שהשרת פועל ונסה שוב" />
      ) : logs.length === 0 ? (
        <EmptyState icon="empty" message="לא נמצאו רשומות עבור מחקר זה — בצע פעולות כלשהן ובדוק שוב" />
      ) : filteredLogs.length === 0 ? (
        <EmptyState icon="search" message="לא נמצאו תוצאות לחיפוש" />
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">
            מציג {filteredLogs.length} מתוך {logs.length} פעולות
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredLogs.map((log, idx) => (
                <LogRow key={log.id ?? idx} log={log} meta={getActionMeta(log.actionType)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LogRow({ log, meta }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <span className={`block w-2.5 h-2.5 rounded-full ring-2 ring-white ${meta.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {log.performedByName || log.performedByUserId}
          </span>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{log.actionDescription}</p>
      </div>
      <div className="flex-shrink-0 text-left">
        <p className="text-sm text-gray-400 whitespace-nowrap">{formatDateShort(log.createdAt)}</p>
        <p className="text-sm text-gray-300 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  const icons = {
    empty:  <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    search: <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icons[icon] ?? icons.empty}
      <p className="mt-4 text-sm text-gray-400">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {[...Array(5)].map((_, i) => (
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
