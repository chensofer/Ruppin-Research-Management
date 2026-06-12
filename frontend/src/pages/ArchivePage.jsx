import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArchivedProjects, restoreProject } from '../api/projectsApi';
import Layout from '../components/Layout';

const TODAY = new Date().toISOString().split('T')[0];

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

function getStatusLabel(project) {
  if (!project.endDate) return { text: 'פעיל', color: 'text-green-600' };
  return String(project.endDate).slice(0, 10) >= TODAY
    ? { text: 'פעיל',     color: 'text-green-600' }
    : { text: 'לא פעיל', color: 'text-gray-500'  };
}

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [restoring, setRestoring]     = useState(null);
  const [confirmProject, setConfirmProject] = useState(null);

  useEffect(() => {
    getArchivedProjects()
      .then((r) => setProjects(r.data ?? []))
      .catch(() => toast.error('שגיאה בטעינת הארכיון'))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async () => {
    const project = confirmProject;
    setConfirmProject(null);
    setRestoring(project.projectId);
    try {
      await restoreProject(project.projectId);
      setProjects((prev) => prev.filter((p) => p.projectId !== project.projectId));
      toast.success(`המחקר "${project.projectNameHe || project.projectNameEn}" שוחזר בהצלחה`);
    } catch {
      toast.error('שגיאה בשחזור המחקר');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Layout>
      <div dir="rtl" className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors font-medium group"
            >
              חזרה לרשימה
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">ארכיון מחקרים</h1>
          <p className="text-gray-500 text-sm mt-1">מחקרים שהועברו לארכיון — ניתן לשחזר אותם בכל עת</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg className="w-14 h-14 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p className="text-lg font-semibold">הארכיון ריק</p>
            <p className="text-sm mt-1">אין מחקרים מאורכבים כרגע</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div
                key={p.projectId}
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm text-gray-300 tabular-nums">#{p.projectId}</span>
                  </div>
                  <h2 className="text-base font-bold text-gray-800 leading-snug">
                    {p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`}
                  </h2>
                  {p.projectNameEn && p.projectNameHe && (
                    <p className="text-sm text-gray-400">{p.projectNameEn}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    {p.totalBudget != null && (
                      <span>תקציב: <strong className="text-gray-700">{fmt(p.totalBudget)}</strong></span>
                    )}
                    {(() => { const s = getStatusLabel(p); return (
                      <span>סטטוס: <strong className={s.color}>{s.text}</strong></span>
                    ); })()}
                    {p.archivedAt && (
                      <span>הועבר לארכיון: <strong className="text-gray-700">{fmtDate(p.archivedAt)}</strong></span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/projects/${p.projectId}`)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    צפה
                  </button>
                  <button
                    onClick={() => setConfirmProject(p)}
                    disabled={restoring === p.projectId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
                  >
                    {restoring === p.projectId ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    שחזר
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Restore confirmation dialog */}
      {confirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">שחזור מחקר</h2>
            <p className="text-sm text-gray-500 mb-1">האם אתה בטוח שברצונך לשחזר את המחקר</p>
            <p className="text-sm font-semibold text-gray-800 mb-5">
              "{confirmProject.projectNameHe || confirmProject.projectNameEn}"?
            </p>
            <p className="text-sm text-gray-400 mb-5">המחקר יועבר חזרה לרשימה הפעילה</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setConfirmProject(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors"
              >
                כן, שחזר
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
