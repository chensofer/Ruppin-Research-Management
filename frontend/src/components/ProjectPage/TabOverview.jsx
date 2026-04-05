import { useState } from 'react';
import { getUsers } from '../../api/usersApi';
import { getCenters } from '../../api/centersApi';
import { updateProject } from '../../api/projectsApi';

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date) ? '—' : date.toLocaleDateString('he-IL');
};

// ── Display-mode field ──────────────────────────────────────────────────────────
function Field({ label, value, span = 1, highlight }) {
  const display = value !== null && value !== undefined && value !== '' ? value : '—';
  const spanClass = span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : '';
  return (
    <div className={spanClass}>
      <dt className="text-xs text-gray-400 mb-1">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 ${highlight ?? 'text-gray-800'}`}>
        {display}
      </dd>
    </div>
  );
}

// ── Edit-mode field wrapper ─────────────────────────────────────────────────────
const inputCls = 'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errCls   = 'border-red-400 focus:ring-red-400';

function EditField({ label, children, error, span = 1 }) {
  const spanClass = span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : '';
  return (
    <div className={spanClass}>
      <label className="block text-xs text-gray-500 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── PI search picker (used inside edit mode) ────────────────────────────────────
function PIPicker({ value, name: displayName, onChange, error, allUsers, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);

  const filtered = allUsers
    .filter((u) => {
      if (u.systemAuthorization === 'עוזר מחקר') return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return u.userId.toLowerCase().includes(q) ||
             `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const select = (u) => {
    onChange({ id: u.userId, name: `${u.firstName} ${u.lastName}` });
    setQuery('');
    setOpen(false);
  };

  const clear = () => onChange({ id: '', name: '' });

  if (value) {
    return (
      <div className={`flex items-center gap-3 bg-primary/5 border rounded-lg px-3 py-2 ${error ? 'border-red-400' : 'border-primary/20'}`}>
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {displayName?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">{displayName}</p>
          <p className="text-xs text-primary/60">{value}</p>
        </div>
        <button type="button" onClick={clear} className="text-primary/50 hover:text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={loading ? 'טוען...' : 'חפש חוקר לפי שם או ת.ז...'}
        disabled={loading}
        className={`${inputCls} ${error ? errCls : ''}`}
      />
      {open && !loading && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((u) => (
            <li key={u.userId} onMouseDown={() => select(u)}
              className="px-3 py-2.5 cursor-pointer hover:bg-primary/5 text-sm flex justify-between items-center">
              <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
              <span className="text-xs text-gray-400">{u.userId}</span>
            </li>
          )) : (
            <li className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Validation ──────────────────────────────────────────────────────────────────
function validateForm(f) {
  const e = {};
  if (!f.projectNameHe.trim())       e.projectNameHe     = 'שדה חובה';
  if (!f.projectDescription.trim())  e.projectDescription = 'שדה חובה';
  if (!f.principalResearcherId)      e.principalResearcherId = 'יש לבחור חוקר ראשי';
  if (!f.centerId)                   e.centerId          = 'יש לבחור מרכז מחקר';
  if (!f.fundingSource.trim())       e.fundingSource     = 'שדה חובה';
  if (!f.startDate)                  e.startDate         = 'שדה חובה';
  if (!f.endDate)                    e.endDate           = 'שדה חובה';
  if (!f.totalBudget || parseFloat(f.totalBudget) <= 0)
    e.totalBudget = 'יש להזין תקציב תקין';
  if (f.startDate && f.endDate && f.endDate < f.startDate)
    e.endDate = 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
  return e;
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function TabOverview({ detail, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');

  // Lazy-loaded data for edit mode
  const [allUsers, setAllUsers]   = useState([]);
  const [centers, setCenters]     = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const initForm = () => ({
    projectNameHe:         detail.projectNameHe  || '',
    projectNameEn:         detail.projectNameEn  || '',
    projectDescription:    detail.projectDescription || '',
    totalBudget:           detail.totalBudget?.toString() || '',
    fundingSource:         detail.fundingSource  || '',
    startDate:             detail.startDate      || '',
    endDate:               detail.endDate        || '',
    principalResearcherId: detail.principalResearcherId?.trim() || '',
    principalResearcherName: detail.principalResearcherName || '',
    centerId:              detail.centerId?.toString() || '',
  });

  const enterEdit = () => {
    setForm(initForm());
    setErrors({});
    setSaveError('');
    setEditing(true);

    if (allUsers.length === 0 || centers.length === 0) {
      setLoadingMeta(true);
      Promise.all([
        getUsers().then((r) => setAllUsers(r.data)).catch(() => {}),
        getCenters().then((r) => setCenters(r.data)).catch(() => {}),
      ]).finally(() => setLoadingMeta(false));
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setErrors({});
    setSaveError('');
  };

  const setField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setSaveError('');
    try {
      await updateProject(detail.projectId, {
        projectNameHe:         form.projectNameHe.trim(),
        projectNameEn:         form.projectNameEn.trim() || null,
        projectDescription:    form.projectDescription.trim(),
        totalBudget:           parseFloat(form.totalBudget),
        fundingSource:         form.fundingSource.trim(),
        startDate:             form.startDate,
        endDate:               form.endDate,
        principalResearcherId: form.principalResearcherId,
        centerId:              form.centerId ? parseInt(form.centerId) : null,
        // carry unchanged fields
        status:                detail.status,
        researchExpenses:      detail.researchExpenses ?? null,
      });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? 'שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit mode render ──────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-primary/30 shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loadingMeta}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                שמור
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">עריכת פרטי המחקר</h2>
          </div>

          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {/* Row 1: Name + ID (read-only) */}
            <EditField label="שם מחקר (עברית)" error={errors.projectNameHe} span={2}>
              <input
                type="text"
                value={form.projectNameHe}
                onChange={setField('projectNameHe')}
                className={`${inputCls} ${errors.projectNameHe ? errCls : ''}`}
              />
            </EditField>
            <div>
              <p className="text-xs text-gray-400 mb-1">מזהה מחקר</p>
              <p className="text-sm font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                #{detail.projectId}
              </p>
            </div>

            {/* Row 2: English name (full width, optional) */}
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">שם מחקר (אנגלית)</label>
              <input
                type="text"
                value={form.projectNameEn}
                onChange={setField('projectNameEn')}
                placeholder="Research name in English"
                className={inputCls}
              />
            </div>

            {/* Row 3: Description */}
            <EditField label="תיאור המחקר" error={errors.projectDescription} span={3}>
              <textarea
                rows={3}
                value={form.projectDescription}
                onChange={setField('projectDescription')}
                className={`${inputCls} resize-none ${errors.projectDescription ? errCls : ''}`}
              />
            </EditField>

            {/* Row 4: PI */}
            <EditField label="חוקר ראשי" error={errors.principalResearcherId} span={3}>
              <PIPicker
                value={form.principalResearcherId}
                name={form.principalResearcherName}
                onChange={({ id, name }) =>
                  setForm((f) => ({ ...f, principalResearcherId: id, principalResearcherName: name }))
                }
                error={errors.principalResearcherId}
                allUsers={allUsers}
                loading={loadingMeta}
              />
            </EditField>

            {/* Row 5: Center + Funding */}
            <EditField label="מרכז מחקר" error={errors.centerId}>
              <select
                value={form.centerId}
                onChange={setField('centerId')}
                className={`${inputCls} ${errors.centerId ? errCls : ''}`}
                disabled={loadingMeta}
              >
                <option value="">— בחר מרכז מחקר —</option>
                {centers.map((c) => (
                  <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                ))}
              </select>
            </EditField>

            <EditField label="מקור מימון" error={errors.fundingSource}>
              <input
                type="text"
                value={form.fundingSource}
                onChange={setField('fundingSource')}
                className={`${inputCls} ${errors.fundingSource ? errCls : ''}`}
              />
            </EditField>

            <EditField label="תקציב כולל (₪)" error={errors.totalBudget}>
              <input
                type="number"
                min={0}
                value={form.totalBudget}
                onChange={setField('totalBudget')}
                className={`${inputCls} ${errors.totalBudget ? errCls : ''}`}
              />
            </EditField>

            {/* Row 6: Dates */}
            <EditField label="תאריך התחלה" error={errors.startDate}>
              <input
                type="date"
                value={form.startDate}
                onChange={setField('startDate')}
                className={`${inputCls} ${errors.startDate ? errCls : ''}`}
              />
            </EditField>

            <EditField label="תאריך סיום משוערך" error={errors.endDate}>
              <input
                type="date"
                value={form.endDate}
                onChange={setField('endDate')}
                className={`${inputCls} ${errors.endDate ? errCls : ''}`}
              />
            </EditField>

            <div /> {/* spacer */}
          </div>
        </div>

        {/* Researchers + Assistants sections stay read-only in edit mode */}
        <ResearchersCard detail={detail} />
        <AssistantsCard detail={detail} />
      </div>
    );
  }

  // ── Display mode render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Main info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <button
            type="button"
            onClick={enterEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            עריכה
          </button>
          <h2 className="text-sm font-semibold text-gray-700">פרטי המחקר</h2>
        </div>

        <dl className="grid grid-cols-3 gap-x-8 gap-y-5">
          <Field label="שם מחקר" value={detail.projectNameHe || detail.projectNameEn} span={2} />
          <Field label="מזהה מחקר" value={detail.projectId ? `#${detail.projectId}` : null} />

          <Field label="תיאור מחקר" value={detail.projectDescription} span={3} />

          <Field label="חוקר ראשי" value={detail.principalResearcherName || detail.principalResearcherId} />
          <Field label="משויך למרכז מחקר" value={detail.centerName} />
          <Field label="מקור מימון" value={detail.fundingSource} />

          <Field label="תאריך התחלה" value={fmtDate(detail.startDate)} />
          <Field label="תאריך סיום משוערך" value={fmtDate(detail.endDate)} />
          <div />

          <div>
            <dt className="text-xs text-gray-400 mb-1">בקשות תשלומים הממתינות לאישור</dt>
            <dd className="text-sm font-medium mt-0.5">
              {detail.pendingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-yellow-700 bg-yellow-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  {detail.pendingCount} ממתינות
                </span>
              ) : (
                <span className="text-gray-400 text-sm">אין בקשות ממתינות</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-gray-400 mb-1">סה״כ הוצאות שאושרו</dt>
            <dd className={`text-sm font-semibold mt-0.5 ${
              (detail.approvedTotal ?? detail.totalPaid ?? 0) > 0
                ? 'text-green-600'
                : 'text-gray-400'
            }`}>
              {fmt(detail.approvedTotal ?? detail.totalPaid)}
            </dd>
          </div>
        </dl>
      </div>

      <ResearchersCard detail={detail} />
      <AssistantsCard detail={detail} />
    </div>
  );
}

// ── Sub-cards (always read-only) ────────────────────────────────────────────────
function ResearchersCard({ detail }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
        חוקרים {detail.teamMembers?.length > 0 && `(${detail.teamMembers.length})`}
      </h2>
      {detail.teamMembers?.length > 0 ? (
        <div className="space-y-3">
          {detail.teamMembers.map((m) => (
            <div key={m.userId} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-gray-400">{m.userId}</p>
              </div>
              {m.projectRole && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                  {m.projectRole}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">לא משויכים חוקרים</p>
      )}
    </div>
  );
}

function AssistantsCard({ detail }) {
  const fmt = (n) =>
    n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
        עוזרי מחקר {detail.assistants?.length > 0 && `(${detail.assistants.length})`}
      </h2>
      {detail.assistants?.length > 0 ? (
        <div className="space-y-3">
          {detail.assistants.map((a) => (
            <div key={a.assistantUserId} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                <p className="text-xs text-gray-400">{a.assistantUserId}</p>
              </div>
              {a.salaryPerHour && (
                <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                  {fmt(a.salaryPerHour)}/שעה
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">לא משויכים עוזרי מחקר</p>
      )}
    </div>
  );
}
