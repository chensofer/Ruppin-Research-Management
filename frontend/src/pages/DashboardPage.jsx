import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../api/projectsApi';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';

// ── Sort options ────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'default',        label: 'ברירת מחדל' },
  { value: 'startDate_desc', label: 'תאריך התחלה — חדש לישן' },
  { value: 'startDate_asc',  label: 'תאריך התחלה — ישן לחדש' },
  { value: 'remaining_desc', label: 'יתרת תקציב — גבוה לנמוך' },
  { value: 'available_desc', label: 'יתרה זמינה — גבוה לנמוך' },
  { value: 'usage_desc',     label: 'ניצול תקציב — גבוה לנמוך' },
  { value: 'usage_asc',      label: 'ניצול תקציב — נמוך לגבוה' },
  { value: 'pending_desc',   label: 'בקשות ממתינות — הכי הרבה קודם' },
  { value: 'budget_desc',    label: 'תקציב כולל — גבוה לנמוך' },
];

const isActive = (p) =>
  p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';

function sortProjects(list, sortBy) {
  if (sortBy === 'default') return list;
  return [...list].sort((a, b) => {
    switch (sortBy) {
      case 'startDate_desc':
        return (b.startDate ?? '') > (a.startDate ?? '') ? 1 : -1;
      case 'startDate_asc':
        return (a.startDate ?? '') > (b.startDate ?? '') ? 1 : -1;
      case 'remaining_desc':
        return (b.remainingBalance ?? 0) - (a.remainingBalance ?? 0);
      case 'available_desc':
        return (b.availableBalance ?? 0) - (a.availableBalance ?? 0);
      case 'usage_desc': {
        const ua = a.totalBudget > 0 ? a.totalPaid / a.totalBudget : 0;
        const ub = b.totalBudget > 0 ? b.totalPaid / b.totalBudget : 0;
        return ub - ua;
      }
      case 'usage_asc': {
        const ua = a.totalBudget > 0 ? a.totalPaid / a.totalBudget : 0;
        const ub = b.totalBudget > 0 ? b.totalPaid / b.totalBudget : 0;
        return ua - ub;
      }
      case 'pending_desc':
        return (b.pendingCount ?? 0) - (a.pendingCount ?? 0);
      case 'budget_desc':
        return (b.totalBudget ?? 0) - (a.totalBudget ?? 0);
      default:
        return a.projectId - b.projectId;
    }
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects]         = useState([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');   // 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy]             = useState('default');
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);

  const loadProjects = () => {
    setLoading(true);
    getProjects()
      .then((res) => setProjects(res.data))
      .catch(() => toast.error('שגיאה בטעינת המחקרים'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreated = (newProject) => {
    setShowModal(false);
    toast.success(`המחקר "${newProject.projectNameHe}" נוצר בהצלחה!`);
    loadProjects();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('default');
  };

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || sortBy !== 'default';

  // ── Derived list: search → status → sort ──────────────────────────────────
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

  const displayed = sortProjects(afterStatus, sortBy);

  // For the header counter (always reflects the full dataset)
  const totalActive = projects.filter(isActive).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Layout>
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            יצירת מחקר חדש
          </button>

          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">רשימת מחקרים</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalActive} מחקרים פעילים</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם מחקר או חוקר..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 shadow-sm"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter & sort bar */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap" dir="rtl">
          {/* Left: status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-xl">
              {[
                { value: 'all',      label: 'הכל' },
                { value: 'active',   label: 'פעיל' },
                { value: 'inactive', label: 'לא פעיל' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Reset button — only shown when something is non-default */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
                נקה סינון
              </button>
            )}
          </div>

          {/* Right: sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">מיון לפי:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`border rounded-lg pl-3 pr-8 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none ${
                  sortBy !== 'default'
                    ? 'border-primary text-primary font-medium'
                    : 'border-gray-200 text-gray-700'
                }`}
                dir="rtl"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {/* Chevron icon */}
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400">
                {hasActiveFilters
                  ? `מציג ${displayed.length} מתוך ${projects.length} מחקרים`
                  : `${projects.length} מחקרים בסך הכל`}
              </span>
              <div className="flex items-center gap-2">
                {statusFilter === 'active' && (
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
                <h2 className="text-sm font-semibold text-gray-700">
                  {statusFilter === 'active'   ? `מחקרים פעילים (${displayed.length})` :
                   statusFilter === 'inactive' ? `מחקרים לא פעילים (${displayed.length})` :
                   `כל המחקרים (${displayed.length})`}
                </h2>
              </div>
            </div>

            {displayed.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">לא נמצאו מחקרים</p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    נקה סינון
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayed.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </div>
            )}
          </>
        )}
      </Layout>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
