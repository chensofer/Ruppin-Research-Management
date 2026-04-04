import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAssistantProjects,
  getHourReports,
  createHourReport,
  deleteHourReport,
  getMonthlyApproval,
  submitMonthlyApproval,
} from '../api/hourReportsApi';
import Layout from '../components/Layout';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Parse day-of-month from "YYYY-MM-DD" without timezone issues
function parseDayFromDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  return parseInt(s.slice(8, 10), 10);
}

// Ensure time is "HH:mm:ss" (TimeOnly requires seconds)
function toTimeStr(t) {
  if (!t) return null;
  return t.length === 5 ? t + ':00' : t;
}

// Compute worked hours from from/to strings ("HH:mm")
function calcWorkedHours(from, to) {
  if (!from || !to) return null;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const diff = (th * 60 + tm) - (fh * 60 + fm);
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : null;
}

function StatusBadge({ status }) {
  if (!status) return null;
  const styles = {
    'אושר': 'bg-green-100 text-green-700',
    'נדחה': 'bg-red-100 text-red-700',
    'ממתין': 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const now = new Date();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [reports, setReports] = useState([]);
  const [approval, setApproval] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // drafts[day] = { reportId?, fromHour, toHour, workedHours, comments }
  const [drafts, setDrafts] = useState({});

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!user) return;
    getAssistantProjects(user.userId)
      .then((r) => {
        setProjects(r.data);
        if (r.data.length === 1) setSelectedProject(r.data[0]);
      })
      .catch(() => {});
  }, [user]);

  const loadData = useCallback(async () => {
    if (!selectedProject || !user) return;
    setLoadingReports(true);
    setSaveError('');
    try {
      const [rRes, aRes] = await Promise.all([
        getHourReports(user.userId, selectedProject.projectId, month, year),
        getMonthlyApproval(user.userId, selectedProject.projectId, month, year)
          .catch(() => ({ data: null })),
      ]);
      const fetchedReports = rRes.data ?? [];
      setReports(fetchedReports);
      setApproval(aRes.data);

      // Build drafts from saved reports
      const d = {};
      for (const r of fetchedReports) {
        const day = parseDayFromDate(r.reportDate);
        if (day) {
          d[day] = {
            reportId: r.hourReportId,
            fromHour: r.fromHour ? String(r.fromHour).slice(0, 5) : '',
            toHour: r.toHour ? String(r.toHour).slice(0, 5) : '',
            workedHours: r.workedHours != null ? String(r.workedHours) : '',
            comments: r.comments || '',
            saved: true,
          };
        }
      }
      setDrafts(d);
    } finally {
      setLoadingReports(false);
    }
  }, [selectedProject, month, year, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = getDaysInMonth(month, year);
  const isApproved = approval?.approvalStatus === 'אושר';
  const isPending = approval?.approvalStatus === 'ממתין';
  const locked = isApproved || isPending;

  const setDayField = (day, field, value) => {
    setDrafts((prev) => {
      const current = prev[day] || {};
      const updated = { ...current, [field]: value, saved: false };

      // Auto-calculate workedHours when fromHour or toHour changes
      if (field === 'fromHour' || field === 'toHour') {
        const from = field === 'fromHour' ? value : current.fromHour;
        const to = field === 'toHour' ? value : current.toHour;
        const calculated = calcWorkedHours(from, to);
        if (calculated !== null) {
          updated.workedHours = String(calculated);
        }
      }

      return { ...prev, [day]: updated };
    });
  };

  // Total hours from current drafts (not just DB-saved rows)
  const totalHoursFromDrafts = Object.values(drafts).reduce((sum, d) => {
    if (!d?.fromHour && !d?.toHour && !d?.workedHours) return sum;
    const wh = d.workedHours
      ? parseFloat(d.workedHours)
      : calcWorkedHours(d.fromHour, d.toHour) ?? 0;
    return sum + wh;
  }, 0);

  const hasDraftData = Object.values(drafts).some(
    (d) => d?.fromHour || d?.toHour || d?.workedHours
  );

  // Save all days that have data
  const saveAll = async () => {
    if (!selectedProject || !user) return;
    setSaving(true);
    setSaveError('');
    let failed = 0;
    let firstError = '';

    for (const [dayStr, draft] of Object.entries(drafts)) {
      const day = parseInt(dayStr);
      if (!draft?.fromHour && !draft?.toHour && !draft?.workedHours) continue;

      const workedHours = draft.workedHours
        ? parseFloat(draft.workedHours)
        : calcWorkedHours(draft.fromHour, draft.toHour);

      try {
        const res = await createHourReport({
          userId: user.userId,
          projectId: selectedProject.projectId,
          reportDate: `${year}-${pad(month)}-${pad(day)}`,
          fromHour: toTimeStr(draft.fromHour),
          toHour: toTimeStr(draft.toHour),
          workedHours: workedHours > 0 ? workedHours : null,
          comments: draft.comments || null,
        });
        setDrafts((prev) => ({
          ...prev,
          [day]: { ...prev[day], reportId: res.data.hourReportId, saved: true },
        }));
      } catch (err) {
        failed++;
        if (!firstError) {
          const serverMsg = err.response?.data?.title
            || err.response?.data?.message
            || (typeof err.response?.data === 'string' ? err.response.data : null)
            || err.message;
          firstError = `יום ${day}: ${serverMsg || 'שגיאה לא ידועה'}`;
        }
      }
    }

    // Refresh reports list from DB
    const rRes = await getHourReports(user.userId, selectedProject.projectId, month, year)
      .catch(() => ({ data: reports }));
    setReports(rRes.data);

    setSaving(false);
    if (failed > 0) {
      setSaveError(firstError || `שגיאה בשמירת ${failed} ימים`);
    } else {
      showToast('כל הימים נשמרו בהצלחה');
    }
    return failed === 0;
  };

  const clearDay = async (day) => {
    const draft = drafts[day];
    if (draft?.reportId) {
      try {
        await deleteHourReport(draft.reportId, user.userId);
      } catch {
        showToast('שגיאה במחיקה');
        return;
      }
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    setReports((prev) => prev.filter((r) => parseDayFromDate(r.reportDate) !== day));
  };

  const handleSubmit = async () => {
    if (!selectedProject || !user) return;
    setSubmitting(true);
    setSaveError('');

    // Save all first
    const saved = await saveAll();
    if (!saved) {
      setSubmitting(false);
      return;
    }

    // Recalculate total from fresh reports
    const rRes = await getHourReports(user.userId, selectedProject.projectId, month, year)
      .catch(() => ({ data: reports }));
    const freshReports = rRes.data ?? [];
    const total = freshReports.reduce(
      (sum, r) => sum + (r.workedHours ? Number(r.workedHours) : 0), 0
    );

    try {
      const res = await submitMonthlyApproval({
        userId: user.userId,
        projectId: selectedProject.projectId,
        month,
        year,
        totalWorkedHours: total,
        comments: null,
      });
      setApproval(res.data);
      showToast('הדוח נשלח לאישור החוקר');
    } catch {
      showToast('שגיאה בשליחת הדוח');
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = [year - 1, year, year + 1];
  const busy = saving || submitting;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">דיווח נוכחות</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.firstName} {user?.lastName} — מלא את שעות העבודה שלך לחודש הנבחר
          </p>
        </div>

        {/* Selectors */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">מחקר</label>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-400">לא משויך למחקרים</p>
              ) : (
                <select
                  value={selectedProject?.projectId ?? ''}
                  onChange={(e) => {
                    const p = projects.find((pr) => String(pr.projectId) === e.target.value);
                    setSelectedProject(p || null);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— בחר מחקר —</option>
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectNameHe || p.projectNameEn || `מחקר ${p.projectId}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">חודש</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">שנה</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedProject && (
          <>
            {/* Approval status banner */}
            {approval && (
              <div className={`px-5 py-3.5 rounded-xl mb-4 border ${
                isApproved ? 'bg-green-50 border-green-200'
                  : approval.approvalStatus === 'נדחה' ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={approval.approvalStatus} />
                  <span className="text-sm text-gray-700">
                    {isApproved
                      ? `הדוח אושר — סה"כ ${approval.totalWorkedHours} שעות`
                      : isPending
                      ? `ממתין לאישור החוקר — סה"כ ${approval.totalWorkedHours} שעות`
                      : 'הדוח נדחה — ניתן לערוך ולשלוח מחדש'}
                  </span>
                </div>
                {approval.approvalStatus === 'נדחה' && approval.comments && (
                  <p className="text-sm text-red-700 mt-2 pr-1">
                    <span className="font-medium">סיבת הדחייה: </span>{approval.comments}
                  </p>
                )}
              </div>
            )}

            {saveError && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">
                {saveError}
              </div>
            )}

            {/* Days grid */}
            {loadingReports ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {MONTH_NAMES[month - 1]} {year}
                  </span>
                  <span className="text-xs text-gray-500">
                    סה"כ שעות:{' '}
                    <span className="font-semibold text-gray-800">
                      {totalHoursFromDrafts.toFixed(1)}
                    </span>
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayOfWeek = new Date(year, month - 1, day).getDay();
                    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                    const draft = drafts[day];
                    const isSaved = !!draft?.saved && !!draft?.reportId;
                    const hasData = !!(draft?.fromHour || draft?.toHour || draft?.workedHours);
                    const isDirty = hasData && !isSaved;

                    return (
                      <div
                        key={day}
                        className={`flex items-center gap-4 px-5 py-2.5 ${isWeekend ? 'bg-gray-50/70' : ''}`}
                      >
                        {/* Day label */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <p className="text-sm font-semibold text-gray-700">{day}</p>
                          <p className={`text-xs ${isWeekend ? 'text-orange-400' : 'text-gray-400'}`}>
                            {DAY_NAMES[dayOfWeek]}
                          </p>
                        </div>

                        {/* Inputs */}
                        <div className="flex flex-1 items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-400 whitespace-nowrap">משעה</label>
                            <input
                              type="time"
                              value={draft?.fromHour || ''}
                              onChange={(e) => setDayField(day, 'fromHour', e.target.value)}
                              disabled={locked}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400 w-24"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-400 whitespace-nowrap">עד שעה</label>
                            <input
                              type="time"
                              value={draft?.toHour || ''}
                              onChange={(e) => setDayField(day, 'toHour', e.target.value)}
                              disabled={locked}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400 w-24"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-400 whitespace-nowrap">שעות</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={draft?.workedHours || ''}
                              onChange={(e) => setDayField(day, 'workedHours', e.target.value)}
                              placeholder="0"
                              disabled={locked}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400 w-16"
                            />
                          </div>
                          <input
                            type="text"
                            value={draft?.comments || ''}
                            onChange={(e) => setDayField(day, 'comments', e.target.value)}
                            placeholder="הערות..."
                            disabled={locked}
                            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>

                        {/* Status indicator + clear */}
                        <div className="flex items-center gap-2 flex-shrink-0 w-16 justify-end">
                          {isSaved && !isDirty && (
                            <span className="text-xs text-green-600 font-medium">✓ נשמר</span>
                          )}
                          {isDirty && (
                            <span className="text-xs text-amber-500 font-medium">לא נשמר</span>
                          )}
                          {isSaved && !locked && (
                            <button
                              type="button"
                              onClick={() => clearDay(day)}
                              disabled={busy}
                              className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                              title="מחק יום זה"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!locked && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {hasDraftData
                    ? `${Object.values(drafts).filter(d => d?.fromHour || d?.toHour || d?.workedHours).length} ימים מולאו`
                    : 'מלא שעות לימים בהם עבדת'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={busy || !hasDraftData}
                    className="flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving && !submitting ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    שמור
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy || !hasDraftData}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {submitting ? 'שולח...' : `שלח לאישור (${totalHoursFromDrafts.toFixed(1)} שעות)`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedProject && projects.length > 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">בחר מחקר להתחלת הדיווח</p>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </Layout>
  );
}
