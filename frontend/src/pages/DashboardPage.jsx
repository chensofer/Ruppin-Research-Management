import { useEffect, useState, useCallback } from 'react';
import { celebrate } from '../utils/celebrate';
import { useAuth } from '../context/AuthContext';
import ExportReportModal from '../components/ExportReportModal';
import { exportDashboardReport } from '../utils/exportReport';
import { getProjects, getMlInsights } from '../api/projectsApi';
import { getMyNotifications, markAllRead } from '../api/notificationsApi';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import AlertsModal from '../components/AlertsModal';
import toast from 'react-hot-toast';

const BUDGET_ALERT_PCT = 20;
const TIME_ALERT_PCT   = 70;

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function buildAlerts(projects) {
  const today = new Date().toISOString().split('T')[0];
  const budgetAlerts = [];
  const timeAlerts   = [];

  for (const p of projects) {
    const rawActive = p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';
    const endStr    = p.endDate ? String(p.endDate).slice(0, 10) : null;
    const active    = rawActive && (!endStr || endStr >= today);
    if (!active) continue;

    const budget    = p.totalBudget ?? 0;
    const available = p.availableBalance ?? p.remainingBalance ?? (budget - (p.totalPaid ?? 0));
    if (budget > 0) {
      const pct = Math.round((available / budget) * 100);
      if (pct <= BUDGET_ALERT_PCT) {
        budgetAlerts.push({
          projectId: p.projectId,
          name: p.projectNameHe || p.projectNameEn || `מחקר ${p.projectId}`,
          budget, available, pct,
        });
      }
    }

    const startStr = p.startDate ? String(p.startDate).slice(0, 10) : null;
    if (startStr && endStr && endStr > startStr) {
      const total      = daysBetween(startStr, endStr);
      const elapsed    = daysBetween(startStr, today);
      const elapsedPct = Math.min(Math.round((elapsed / total) * 100), 100);
      if (elapsedPct >= TIME_ALERT_PCT) {
        const daysLeft = Math.max(daysBetween(today, endStr), 0);
        const fmtDate = (() => {
          try { return new Date(endStr).toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' }); }
          catch { return endStr; }
        })();
        timeAlerts.push({
          projectId: p.projectId,
          name: p.projectNameHe || p.projectNameEn || `מחקר ${p.projectId}`,
          endDate: fmtDate, daysLeft, elapsedPct,
        });
      }
    }
  }
  return { budgetAlerts, timeAlerts };
}

const SORT_OPTIONS = [
  { value: 'default',          label: 'ברירת מחדל' },
  { value: 'startDate_desc',   label: 'תאריך התחלה — חדש לישן' },
  { value: 'startDate_asc',    label: 'תאריך התחלה — ישן לחדש' },
  { value: 'budget_desc',      label: 'תקציב — גבוה לנמוך' },
  { value: 'budget_asc',       label: 'תקציב — נמוך לגבוה' },
  { value: 'available_desc',   label: 'יתרה — גבוה לנמוך' },
  { value: 'available_asc',    label: 'יתרה — נמוך לגבוה' },
  { value: 'researchers_desc', label: 'חוקרים — הכי הרבה קודם' },
  { value: 'researchers_asc',  label: 'חוקרים — הכי פחות קודם' },
];

const TODAY = new Date().toISOString().split('T')[0];

const isActive = (p) => {
  const s = p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';
  if (!s) return false;
  if (p.endDate && String(p.endDate).slice(0, 10) < TODAY) return false;
  return true;
};

function sortProjects(list, sortBy) {
  if (sortBy === 'default') return list;
  return [...list].sort((a, b) => {
    switch (sortBy) {
      case 'startDate_desc': return (b.startDate ?? '') > (a.startDate ?? '') ? 1 : -1;
      case 'startDate_asc':  return (a.startDate ?? '') > (b.startDate ?? '') ? 1 : -1;
      case 'budget_desc':    return (b.totalBudget ?? 0) - (a.totalBudget ?? 0);
      case 'budget_asc':     return (a.totalBudget ?? 0) - (b.totalBudget ?? 0);
      case 'available_desc': return (b.availableBalance ?? 0) - (a.availableBalance ?? 0);
      case 'available_asc':  return (a.availableBalance ?? 0) - (b.availableBalance ?? 0);
      case 'researchers_desc': return (b.teamMemberCount ?? 0) - (a.teamMemberCount ?? 0);
      case 'researchers_asc':  return (a.teamMemberCount ?? 0) - (b.teamMemberCount ?? 0);
      default: return a.projectId - b.projectId;
    }
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects]         = useState([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy]             = useState('default');
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [alertsOpen, setAlertsOpen]     = useState(false);
  const [showExport, setShowExport]     = useState(false);
  const [budgetAlerts, setBudgetAlerts]       = useState([]);
  const [timeAlerts, setTimeAlerts]           = useState([]);
  const [transferNotifs, setTransferNotifs]   = useState([]);
  const [alertsSeen, setAlertsSeen]           = useState(false);
  const [mlInsights, setMlInsights]           = useState(null);

  const handleDismissAlerts = () => {
    setAlertsOpen(false);
    if (transferNotifs.length > 0) {
      markAllRead().catch(() => {});
      setTransferNotifs([]);
    }
  };

  const loadProjects = useCallback(() => {
    setLoading(true);
    Promise.all([
      getProjects(),
      getMyNotifications().catch(() => ({ data: [] })),
    ]).then(([res, notifRes]) => {
        const data = res.data ?? [];
        const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
        setProjects(data);
        setTransferNotifs(notifs);
        try {
          const { budgetAlerts: ba, timeAlerts: ta } = buildAlerts(data);
          setBudgetAlerts(ba);
          setTimeAlerts(ta);
          if ((ba.length > 0 || ta.length > 0 || notifs.length > 0) && !sessionStorage.getItem('alerts_shown')) {
            sessionStorage.setItem('alerts_shown', '1');
            setAlertsOpen(true);
            setAlertsSeen(true);
          }
        } catch (e) { console.error('buildAlerts error:', e); }
      })
      .catch(() => toast.error('שגיאה בטעינת המחקרים'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // תוצרי הרכיב החכם (Python) - ציון סיכון תקציבי לכל מחקר, נטען בנפרד כדי
  // שלא לעכב את טעינת רשימת המחקרים עצמה
  useEffect(() => {
    getMlInsights()
      .then((res) => setMlInsights(res.data))
      .catch(() => setMlInsights(null));
  }, []);

  const handleCreated = (newProject) => {
    setShowModal(false);
    celebrate('project_created', `המחקר "${newProject.projectNameHe}" נוצר בהצלחה!`);
    loadProjects();
  };

  const resetFilters = () => { setSearch(''); setStatusFilter('active'); setSortBy('default'); };
  const hasActiveFilters = search !== '' || statusFilter !== 'active' || sortBy !== 'default';
  const totalAlerts = budgetAlerts.length + timeAlerts.length + transferNotifs.length;

  const afterSearch = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.projectNameHe?.toLowerCase().includes(q) ||
      p.projectNameEn?.toLowerCase().includes(q) ||
      p.principalResearcherId?.toLowerCase().includes(q)
    );
  });

  const afterStatus =
    statusFilter === 'active'   ? afterSearch.filter(isActive) :
    statusFilter === 'inactive' ? afterSearch.filter((p) => !isActive(p)) :
    afterSearch;

  const displayed   = sortProjects(afterStatus, sortBy);
  const totalActive = projects.filter(isActive).length;

  return (
    <>
      <Layout>
        <div dir="rtl">

          {/* ── Page Header ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                רשימת מחקרים
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setAlertsOpen(true); setAlertsSeen(true); }}
                title="הצג התראות"
                className="relative p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-xl transition-all duration-150 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalAlerts > 0 && !alertsSeen && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center px-1">
                    {totalAlerts}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-green-600 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">ייצוא דוח</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn-accent flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">מחקר חדש</span>
                <span className="sm:hidden">חדש</span>
              </button>
            </div>
          </div>

          {/* ── Search ─────────────────────────────────────────────────── */}
          <div className="relative mb-3">
            <svg
              className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם מחקר או חוקר..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-gray-400 shadow-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Filter + Sort bar ───────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {/* Status chips + clear */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
                {[
                  { value: 'all',      label: 'הכל',     count: projects.length },
                  { value: 'active',   label: 'פעיל',    count: totalActive },
                  { value: 'inactive', label: 'לא פעיל', count: projects.length - totalActive },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-150 ${
                      statusFilter === opt.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {opt.label}
                    <span className={`text-sm tabular-nums ${
                      statusFilter === opt.value ? 'text-gray-500' : 'text-gray-300'
                    }`}>
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  נקה
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-sm text-gray-400 whitespace-nowrap">מיון:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`border rounded-xl pr-3 pl-7 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none ${
                    sortBy !== 'default' ? 'border-primary text-primary font-semibold' : 'border-gray-200 text-gray-600'
                  }`}
                  dir="rtl"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">טוען מחקרים...</p>
            </div>
          ) : (
            <>
              {/* Results label */}
              <p className="text-sm text-gray-400 mb-3 font-medium">
                {hasActiveFilters
                  ? `מציג ${displayed.length} מתוך ${projects.length} מחקרים`
                  : `${projects.length} מחקרים`}
              </p>

              {displayed.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-500">לא נמצאו מחקרים</p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="mt-3 text-sm text-primary hover:underline font-medium">
                      נקה סינון
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {displayed.map((project) => (
                      <ProjectCard
                        key={project.projectId}
                        project={project}
                        riskInsight={mlInsights?.projects?.[project.projectId] ?? mlInsights?.projects?.[String(project.projectId)]}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Layout>

      {showModal && (
        <CreateProjectModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
      {alertsOpen && (
        <AlertsModal budgetAlerts={budgetAlerts} timeAlerts={timeAlerts} transferRequests={transferNotifs} onClose={handleDismissAlerts} />
      )}
      {showExport && (
        <ExportReportModal
          type="dashboard"
          projects={projects}
          onClose={() => setShowExport(false)}
          onExport={async (sections, format, projectsToExport) =>
            await exportDashboardReport(projectsToExport, sections, format)}
        />
      )}
    </>
  );
}
