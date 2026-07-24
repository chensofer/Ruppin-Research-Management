import { useState, useEffect, useCallback, useRef } from 'react';
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
import { celebrate } from '../utils/celebrate';

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

function parseDayFromDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  return parseInt(s.slice(8, 10), 10);
}

function toTimeStr(t) {
  if (!t) return null;
  return t.length === 5 ? t + ':00' : t;
}

function calcWorkedHours(from, to) {
  if (!from || !to) return null;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const diff = (th * 60 + tm) - (fh * 60 + fm);
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : null;
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

  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState('');
  const [dayErrors, setDayErrors] = useState({});

  const saveAllRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

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

      if (field === 'fromHour' || field === 'toHour') {
        const from = field === 'fromHour' ? value : current.fromHour;
        const to   = field === 'toHour'   ? value : current.toHour;
        if (from && to) {
          const [fh, fm] = from.split(':').map(Number);
          const [th, tm] = to.split(':').map(Number);
          if (fh * 60 + fm >= th * 60 + tm) {
            setDayErrors((e) => ({ ...e, [day]: 'שעת ההתחלה חייבת להיות לפני שעת הסיום' }));
          } else {
            setDayErrors((e) => { const n = { ...e }; delete n[day]; return n; });
            const calculated = calcWorkedHours(from, to);
            if (calculated !== null) updated.workedHours = String(calculated);
          }
        } else {
          setDayErrors((e) => { const n = { ...e }; delete n[day]; return n; });
        }
      }

      return { ...prev, [day]: updated };
    });

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      saveAllRef.current?.();
    }, 1500);
  };

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

  const saveAll = async () => {
    if (!selectedProject || !user) return;
    setSaving(true);
    setSaveError('');
    let failed = 0;
    let firstError = '';

    for (const [dayStr, draft] of Object.entries(drafts)) {
      const day = parseInt(dayStr);
      if (!draft?.fromHour && !draft?.toHour && !draft?.workedHours) continue;
      if (dayErrors[day]) { failed++; if (!firstError) firstError = `יום ${day}: ${dayErrors[day]}`; continue; }

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

  saveAllRef.current = saveAll;

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

    const saved = await saveAll();
    if (!saved) { setSubmitting(false); return; }

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
        month, year,
        totalWorkedHours: total,
        comments: null,
      });
      setApproval(res.data);
      celebrate('hours_submitted');
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">דיווח נוכחות</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.firstName} {user?.lastName} — מלא את שעות העבודה שלך לחודש הנבחר
          </p>
        </div>

        {/* Selectors */}
        <div className="card p-5 mb-5 sticky top-16 md:top-0 z-20 shadow-md bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-semibold">מחקר</label>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">לא משויך למחקרים</p>
              ) : (
                <select
                  value={selectedProject?.projectId ?? ''}
                  onChange={(e) => {
                    const p = projects.find((pr) => String(pr.projectId) === e.target.value);
                    setSelectedProject(p || null);
                  }}
                  className="input-field"
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
              <label className="block text-sm text-gray-500 mb-1.5 font-semibold">חודש</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field">
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-semibold">שנה</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedProject && (
          <>
            {/* Approval status banner */}
            {approval && (
              <div className={`px-5 py-4 rounded-2xl mb-4 border flex items-start gap-3 ${
                isApproved
                  ? 'bg-accent-light border-accent/30'
                  : approval.approvalStatus === 'נדחה'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isApproved ? 'bg-accent text-white'
                    : approval.approvalStatus === 'נדחה' ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  {isApproved ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : approval.approvalStatus === 'נדחה' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    isApproved ? 'text-accent-dark'
                      : approval.approvalStatus === 'נדחה' ? 'text-red-700'
                      : 'text-amber-700'
                  }`}>
                    {isApproved
                      ? `הדוח אושר — סה"כ ${approval.totalWorkedHours} שעות`
                      : isPending
                      ? `ממתין לאישור החוקר — סה"כ ${approval.totalWorkedHours} שעות`
                      : 'הדוח נדחה — ניתן לערוך ולשלוח מחדש'}
                  </p>
                  {approval.approvalStatus === 'נדחה' && approval.comments && (
                    <p className="text-sm text-red-600 mt-1">
                      <span className="font-medium">סיבת הדחייה: </span>{approval.comments}
                    </p>
                  )}
                </div>
              </div>
            )}

            {saveError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                {saveError}
              </div>
            )}

            {/* Days grid */}
            {loadingReports ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden mb-5">
                {/* Grid header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-light">
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {MONTH_NAMES[month - 1]} {year}
                  </span>
                  <div className="flex items-center gap-2">
                    {saving && !submitting && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <span className="inline-block w-3 h-3 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                        שומר...
                      </span>
                    )}
                    <span className="text-sm bg-primary text-white px-3 py-1.5 rounded-full font-bold shadow-sm">
                      ⏱ סה"כ: {totalHoursFromDrafts.toFixed(1)} שע'
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayOfWeek = new Date(year, month - 1, day).getDay();
                    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                    const draft = drafts[day];
                    const isSaved = !!draft?.saved && !!draft?.reportId;
                    const hasData = !!(draft?.fromHour || draft?.toHour || draft?.workedHours);
                    const isDirty = hasData && !isSaved;

                    const StatusIndicator = () => (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {dayErrors[day] && (
                          <span className="text-sm text-red-500 font-semibold whitespace-nowrap" title={dayErrors[day]}>שגיאה</span>
                        )}
                        {!dayErrors[day] && isSaved && !isDirty && (
                          <span className="text-sm text-accent font-bold flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            נשמר
                          </span>
                        )}
                        {!dayErrors[day] && isDirty && saving && (
                          <span className="inline-block w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        )}
                        {!dayErrors[day] && isDirty && !saving && (
                          <span className="text-sm text-amber-500 font-semibold">ממתין</span>
                        )}
                        {isSaved && !locked && (
                          <button
                            type="button"
                            onClick={() => clearDay(day)}
                            disabled={busy}
                            className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 p-0.5"
                            title="מחק יום זה"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );

                    return (
                      <div
                        key={day}
                        className={`transition-colors ${
                          dayErrors[day] ? 'bg-red-50/70' : isWeekend ? 'bg-gray-50/60' : hasData ? 'bg-primary-light/20' : ''
                        }`}
                      >
                        {/* Mobile layout: stacked */}
                        <div className="flex sm:hidden items-center gap-2 px-3 pt-2.5 pb-1">
                          <div className="w-10 flex-shrink-0 text-center">
                            <p className={`text-sm font-bold leading-none ${isWeekend ? 'text-gray-400' : 'text-gray-800'}`}>{day}</p>
                            <p className={`text-sm font-medium mt-0.5 ${isWeekend ? 'text-orange-400' : 'text-gray-400'}`}>{DAY_NAMES[dayOfWeek]}</p>
                          </div>
                          <div className="flex flex-1 items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap">משעה</label>
                              <input type="time" value={draft?.fromHour || ''} onChange={(e) => setDayField(day, 'fromHour', e.target.value)}
                                disabled={locked}
                                className="border border-gray-200 rounded-md px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 bg-white w-[90px]" />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap">עד</label>
                              <input type="time" value={draft?.toHour || ''} onChange={(e) => setDayField(day, 'toHour', e.target.value)}
                                disabled={locked}
                                className="border border-gray-200 rounded-md px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 bg-white w-[90px]" />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap">שעות</label>
                              <input type="number" step="0.5" min="0" max="24" value={draft?.workedHours || ''} onChange={(e) => setDayField(day, 'workedHours', e.target.value)}
                                placeholder="0" disabled={locked}
                                className="border border-gray-200 rounded-md px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 bg-white w-12" />
                            </div>
                            <input type="text" value={draft?.comments || ''} onChange={(e) => setDayField(day, 'comments', e.target.value)}
                              placeholder="הערות..." disabled={locked}
                              className="flex-1 min-w-[80px] border border-gray-200 rounded-md px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 bg-white placeholder-gray-300" />
                          </div>
                          <StatusIndicator />
                        </div>

                        {/* Desktop layout: single row */}
                        <div className="hidden sm:flex items-center gap-3 px-5 py-2.5">
                          <div className="w-14 flex-shrink-0 text-center">
                            <p className={`text-sm font-bold ${isWeekend ? 'text-gray-400' : 'text-gray-800'}`}>{day}</p>
                            <p className={`text-sm font-medium ${isWeekend ? 'text-orange-400' : 'text-gray-400'}`}>{DAY_NAMES[dayOfWeek]}</p>
                          </div>
                          <div className="flex flex-1 items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap font-medium">משעה</label>
                              <input type="time" value={draft?.fromHour || ''} onChange={(e) => setDayField(day, 'fromHour', e.target.value)}
                                disabled={locked}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 w-24 bg-white" />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap font-medium">עד שעה</label>
                              <input type="time" value={draft?.toHour || ''} onChange={(e) => setDayField(day, 'toHour', e.target.value)}
                                disabled={locked}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 w-24 bg-white" />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-sm text-gray-400 whitespace-nowrap font-medium">שעות</label>
                              <input type="number" step="0.5" min="0" max="24" value={draft?.workedHours || ''} onChange={(e) => setDayField(day, 'workedHours', e.target.value)}
                                placeholder="0" disabled={locked}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 w-16 bg-white" />
                            </div>
                            <input type="text" value={draft?.comments || ''} onChange={(e) => setDayField(day, 'comments', e.target.value)}
                              placeholder="הערות..." disabled={locked}
                              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-gray-50 disabled:text-gray-300 bg-white placeholder-gray-300" />
                          </div>
                          <StatusIndicator />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action bar */}
            {!locked && (
              <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  {saving && !submitting ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                      שומר...
                    </>
                  ) : hasDraftData ? (
                    <span className="text-gray-700 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {Object.values(drafts).filter(d => d?.fromHour || d?.toHour || d?.workedHours).length} ימים מולאו
                      </span>
                    </span>
                  ) : (
                    'מלא שעות לימים בהם עבדת'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy || !hasDraftData}
                  className="bg-accent hover:bg-accent-dark text-white font-bold rounded-lg px-5 py-1.5 text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {submitting ? 'שולח...' : `שלח לאישור (${totalHoursFromDrafts.toFixed(1)} שע')`}
                </button>
              </div>
            )}
          </>
        )}

        {!selectedProject && projects.length > 0 && (
          <div className="card py-20 text-center">
            <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">בחר מחקר להתחלת הדיווח</p>
            <p className="text-sm text-gray-400 mt-1">בחר מחקר וחודש מהתפריטים למעלה</p>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
    </Layout>
  );
}
