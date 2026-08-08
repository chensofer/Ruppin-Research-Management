import { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { addHistorySheet } from '../utils/exportReport';
import Layout from '../components/Layout';
import MobileSelect from '../components/MobileSelect';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, getAllAuditLogs } from '../api/auditApi';
import { getProjects, getAllProjects } from '../api/projectsApi';

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
  { value: 'financial', label: 'תקציב ותשלומים' },
  { value: 'all',       label: 'הכל' },
  { value: 'project',   label: 'מחקר' },
  { value: 'team',      label: 'צוות' },
  { value: 'payment',   label: 'תשלומים' },
  { value: 'hours',     label: 'דוחות שעות' },
  { value: 'budget',    label: 'תקציב' },
  { value: 'files',     label: 'קבצים' },
];

const CATEGORY_COLORS = {
  financial: 'bg-green-50 text-green-700 border-green-200',
  all:       'bg-gray-100 text-gray-700 border-gray-200',
  project:   'bg-blue-50 text-blue-700 border-blue-200',
  team:      'bg-purple-50 text-purple-700 border-purple-200',
  payment:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  hours:     'bg-orange-50 text-orange-700 border-orange-200',
  budget:    'bg-teal-50 text-teal-700 border-teal-200',
  files:     'bg-slate-50 text-slate-600 border-slate-200',
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

function formatRelativeDate(iso) {
  if (!iso) return null;
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  return `לפני ${Math.floor(diffDays / 365)} שנים`;
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
async function exportToExcel(logs, projectName, allProjects) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RupResearch';
  wb.modified = new Date();

  const adaptedLogs = logs.map(log => ({
    createdAt:         log.createdAt,
    performedByName:   log.performedByName || log.performedByUserId || '',
    performedByUserId: log.performedByUserId || '',
    actionType:        log.actionType,
    actionDescription: log.actionDescription || '',
  }));

  const label = projectName || (allProjects ? 'כל המחקרים' : 'מחקר');
  addHistorySheet(wb, adaptedLogs, label);

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `היסטוריית_שינויים_${label.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { user } = useAuth();
  const isSecretary = user?.systemAuthorization === 'מזכירות';

  const [projects, setProjects]         = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectStatus, setProjectStatus] = useState('active'); // 'active' | 'archived'
  const [projectSearch, setProjectSearch] = useState('');
  const [logs, setLogs]                 = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLogs, setLoadingLogs]   = useState(false);
  const [logsError, setLogsError]       = useState(false);
  const [category, setCategory]         = useState('financial');
  const [search, setSearch]             = useState('');
  // map of projectId (string) → ISO date string of last financial change
  const [lastChange, setLastChange]     = useState({});

  // Load projects — secretary gets all (active+archived), others get their own
  useEffect(() => {
    const fetch = isSecretary ? getAllProjects() : getProjects();
    fetch
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setProjects(list);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [isSecretary]);

  // Secretary: load all audit logs in background to compute per-project last financial change
  useEffect(() => {
    if (!isSecretary) return;
    getAllAuditLogs()
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : [];
        const map = {};
        for (const log of all) {
          const cat = getActionMeta(log.actionType).category;
          if (cat !== 'payment' && cat !== 'budget') continue;
          const pid = String(log.projectId);
          if (!map[pid] || log.createdAt > map[pid]) map[pid] = log.createdAt;
        }
        setLastChange(map);
      })
      .catch(() => {});
  }, [isSecretary]);

  // Filtered projects by active/archived status + search (secretary only), sorted by last financial change
  const visibleProjects = useMemo(() => {
    if (!isSecretary) return projects;
    const q = projectSearch.trim().toLowerCase();
    const filtered = projects.filter(p => {
      if (projectStatus === 'archived' ? !p.isArchived : p.isArchived) return false;
      if (!q) return true;
      const name = (p.projectNameHe || p.projectNameEn || '').toLowerCase();
      const researcher = (p.principalResearcherName || p.principalResearcherId || '').toLowerCase();
      return name.includes(q) || researcher.includes(q);
    });
    return [...filtered].sort((a, b) => {
      const da = lastChange[String(a.projectId)] ?? '';
      const db = lastChange[String(b.projectId)] ?? '';
      return db.localeCompare(da);
    });
  }, [projects, projectStatus, isSecretary, lastChange, projectSearch]);

  // When visible projects change, select the first one
  useEffect(() => {
    if (visibleProjects.length > 0)
      setSelectedProjectId(String(visibleProjects[0].projectId));
    else
      setSelectedProjectId('');
  }, [visibleProjects]);

  // Load logs when selected project changes (same for both roles)
  useEffect(() => {
    if (!selectedProjectId) { setLogs([]); return; }
    setLoadingLogs(true);
    setLogsError(false);
    setCategory('financial');
    setSearch('');
    getAuditLogs(selectedProjectId)
      .then(res => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => { setLogs([]); setLogsError(true); })
      .finally(() => setLoadingLogs(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => String(p.projectId) === selectedProjectId);

  // Apply project filter (secretary only — filtering already done server-side, this is for useMemo compatibility)
  const projectFilteredLogs = useMemo(() => {
    return Array.isArray(logs) ? logs : [];
  }, [logs]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: projectFilteredLogs.length, financial: 0 };
    for (const log of projectFilteredLogs) {
      const cat = getActionMeta(log.actionType).category;
      counts[cat] = (counts[cat] ?? 0) + 1;
      if (cat === 'payment' || cat === 'budget') counts.financial += 1;
    }
    return counts;
  }, [projectFilteredLogs]);

  // Final filtered list
  const filteredLogs = useMemo(() => {
    const base = Array.isArray(projectFilteredLogs) ? projectFilteredLogs : [];
    let result = base;
    const effectiveCategory = isSecretary ? 'financial' : category;
    if (effectiveCategory === 'financial')
      result = result.filter(l => ['payment', 'budget'].includes(getActionMeta(l.actionType).category));
    else if (effectiveCategory !== 'all')
      result = result.filter(l => getActionMeta(l.actionType).category === effectiveCategory);
    if (search.trim())
      result = result.filter(l =>
        l.actionDescription?.includes(search) ||
        l.performedByName?.includes(search) ||
        l.performedByUserId?.includes(search) ||
        l.projectNameHe?.includes(search)
      );
    return result;
  }, [projectFilteredLogs, category, search]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeFiltered = Array.isArray(filteredLogs) ? filteredLogs : [];

  return (
    <Layout>
      <div dir="rtl">
        {/* ── Header ── */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">היסטוריית שינויים</h1>
            <p className="text-sm text-gray-400 mt-0.5">מעקב אחר כלל הפעולות שבוצעו בכל מחקר</p>
          </div>

          {safeFiltered.length > 0 && (
            <button
              onClick={() => exportToExcel(safeFiltered, selectedProject?.projectNameHe, isSecretary)}
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
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              בחר מחקר
            </label>
            {/* Active / Archived toggle — secretary only */}
            {isSecretary && (
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {[{ v: 'active', l: 'פעילים' }, { v: 'archived', l: 'ארכיון' }].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setProjectStatus(v)}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
                      projectStatus === v
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isSecretary && (
            <div className="relative mb-2">
              <input
                type="text"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder="חיפוש לפי שם מחקר או חוקר..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                dir="rtl"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
          {loadingProjects ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : visibleProjects.length === 0 ? (
            <p className="text-sm text-gray-400">{projectSearch ? 'לא נמצאו תוצאות לחיפוש' : 'לא נמצאו מחקרים'}</p>
          ) : isSecretary ? (
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1 pr-0.5">
              {visibleProjects.map(p => {
                const pid = String(p.projectId);
                const isActive = selectedProjectId === pid;
                const changeDate = lastChange[pid];
                const relDate = formatRelativeDate(changeDate);
                const isRecent = changeDate && (new Date() - new Date(changeDate)) < 7 * 24 * 60 * 60 * 1000;
                return (
                  <button
                    key={pid}
                    onClick={() => setSelectedProjectId(pid)}
                    className={`flex items-center justify-between gap-3 w-full text-right px-3.5 py-2.5 rounded-xl text-sm transition-all border ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-800 border-gray-100 hover:border-primary/30 hover:bg-blue-50/40'
                    }`}
                  >
                    <span className="flex-1 min-w-0 text-right">
                      <span className="block font-medium truncate">{p.projectNameHe || p.projectNameEn || `מחקר #${pid}`}</span>
                      {p.principalResearcherName && (
                        <span className={`flex items-center gap-1 text-sm truncate ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {p.principalResearcherName}
                        </span>
                      )}
                    </span>
                    {relDate && (
                      <span className={`flex-shrink-0 text-sm font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isRecent
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {relDate}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <MobileSelect
              value={String(selectedProjectId)}
              onChange={setSelectedProjectId}
              placeholder=""
              searchable
              searchPlaceholder="חיפוש מחקר לפי שם..."
              options={visibleProjects.map(p => ({
                value: String(p.projectId),
                label: p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`,
              }))}
            />
          )}
        </div>

        {/* ── Category filter chips — hidden for secretary (always shows financial) ── */}
        {!isSecretary && !loadingLogs && safeLogs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat.value] ?? 0;
              const isActive = category === cat.value;
              const CatIcon = CATEGORY_ICONS[cat.value];
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
                  {CatIcon && <CatIcon />}
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

        {/* ── Search ── */}
        {!loadingLogs && safeLogs.length > 0 && (
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
        ) : safeLogs.length === 0 ? (
          <EmptyState icon="empty" message="לא נמצאו רשומות — בצע פעולות כלשהן ובדוק שוב" />
        ) : safeFiltered.length === 0 ? (
          <EmptyState icon="search" message="לא נמצאו תוצאות לחיפוש" />
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">
              מציג {safeFiltered.length} מתוך {safeLogs.length} פעולות
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {safeFiltered.map((log, idx) => (
                  <LogRow
                    key={log.id ?? idx}
                    log={log}
                    meta={getActionMeta(log.actionType)}
                    showProject={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function LogRow({ log, meta, showProject }) {
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
          {showProject && (log.projectNameHe || log.projectNameEn) && (
            <span className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {log.projectNameHe || log.projectNameEn}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{log.actionDescription}</p>
      </div>
      <div className="flex-shrink-0 text-left">
        <p className="text-sm text-gray-400 whitespace-nowrap">{formatDateShort(log.createdAt)}</p>
        <p className="text-sm text-gray-400 whitespace-nowrap text-left">
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
