import { useState } from 'react';
import HebrewDatePicker from '../HebrewDatePicker';
import toast from 'react-hot-toast';
import { getUsers } from '../../api/usersApi';
import { getCenters } from '../../api/centersApi';
import { updateProject } from '../../api/projectsApi';
import UserAvatar from '../UserAvatar';
import MobileSelect from '../MobileSelect';


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
  const spanClass = span === 3 ? 'col-span-1 sm:col-span-2 md:col-span-3' : span === 2 ? 'col-span-1 sm:col-span-2' : '';
  return (
    <div className={spanClass}>
      <dt className="text-sm text-gray-400 mb-1">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 ${highlight ?? 'text-gray-800'}`}>
        {display}
      </dd>
    </div>
  );
}

// ── Edit-mode field wrapper ─────────────────────────────────────────────────────
const inputCls = 'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errCls   = 'border-red-400 focus:ring-red-400';

function EditField({ label, children, error, span = 1, required = false }) {
  const spanClass = span === 3 ? 'col-span-1 sm:col-span-2 md:col-span-3' : span === 2 ? 'col-span-1 sm:col-span-2' : '';
  return (
    <div className={spanClass}>
      <label className="block text-sm text-gray-500 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── PI search picker (used inside edit mode) ────────────────────────────────────
function PIPicker({ value, name: displayName, onChange, error, allUsers, loading, disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);

  const filtered = allUsers
    .filter((u) => {
      if (u.systemAuthorization === 'עוזר מחקר') return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return u.userId.toLowerCase().includes(q) ||
             `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
    });

  const select = (u) => {
    onChange({ id: u.userId, name: `${u.firstName} ${u.lastName}` });
    setQuery('');
    setOpen(false);
  };

  const clear = () => onChange({ id: '', name: '' });

  if (value) {
    return (
      <div className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${disabled ? 'bg-gray-50 border-gray-100' : 'bg-primary/5'} ${error ? 'border-red-400' : disabled ? '' : 'border-primary/20'}`}>
        <UserAvatar userId={value} firstName={displayName} size="sm" className={disabled ? 'bg-gray-400 text-white' : 'bg-primary text-white'} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${disabled ? 'text-gray-500' : 'text-primary'}`}>{displayName}</p>
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-primary/60'}`}>{value}</p>
        </div>
        {!disabled && (
          <button type="button" onClick={clear} className="text-primary/50 hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
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
        disabled={loading || disabled}
        className={`${inputCls} ${error ? errCls : ''}`}
      />
      {open && !loading && !disabled && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((u) => (
            <li key={u.userId} onMouseDown={() => select(u)}
              className="px-3 py-2.5 cursor-pointer hover:bg-primary/5 text-sm flex justify-between items-center">
              <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
              <span className="text-sm text-gray-400">{u.userId}</span>
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
  if (!f.projectNameHe.trim())  e.projectNameHe = 'שדה חובה';
  if (!f.principalResearcherId) e.principalResearcherId = 'יש לבחור חוקר ראשי';
  if (!f.startDate)             e.startDate = 'שדה חובה';
  if (!f.endDate)               e.endDate   = 'שדה חובה';
  if (!f.totalBudget || parseFloat(f.totalBudget) <= 0)
    e.totalBudget = 'יש להזין תקציב תקין';
  if (f.startDate && f.endDate && f.endDate < f.startDate)
    e.endDate = 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
  return e;
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function TabOverview({ detail, onChanged, readOnly = false, hasEnded = false }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

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
  };

  const setField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
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
        status:                detail.status,
        researchExpenses:      detail.researchExpenses ?? null,
      });
      setEditing(false);
      toast.success('פרטי המחקר עודכנו בהצלחה');
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'שגיאה בשמירת הנתונים');
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
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                {hasEnded ? 'עדכון תאריך סיום' : 'עריכת פרטי המחקר'}
              </h2>
              {hasEnded && (
                <p className="text-sm text-gray-400 mt-0.5">
                  המחקר הסתיים — ניתן רק לעדכן את תאריך הסיום אם דרוש עוד זמן. שאר הפרטים נעולים.
                </p>
              )}
            </div>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {/* Row 1: Name + ID (read-only) */}
            <EditField label="שם מחקר (עברית)" error={errors.projectNameHe} span={2} required>
              <input
                type="text"
                value={form.projectNameHe}
                onChange={setField('projectNameHe')}
                disabled={hasEnded}
                className={`${inputCls} ${errors.projectNameHe ? errCls : ''} ${hasEnded ? 'bg-gray-50 text-gray-400' : ''}`}
              />
            </EditField>
            <div>
              <p className="text-sm text-gray-400 mb-1">מזהה מחקר</p>
              <p className="text-sm font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                #{detail.projectId}
              </p>
            </div>

            {/* Row 2: English name (full width, optional) */}
            <div className="col-span-3">
              <label className="block text-sm text-gray-500 mb-1">שם מחקר (אנגלית)</label>
              <input
                type="text"
                value={form.projectNameEn}
                onChange={setField('projectNameEn')}
                placeholder="Research name in English"
                disabled={hasEnded}
                className={`${inputCls} ${hasEnded ? 'bg-gray-50 text-gray-400' : ''}`}
              />
            </div>

            {/* Row 3: Description */}
            <EditField label="תיאור המחקר" error={errors.projectDescription} span={3}>
              <textarea
                rows={3}
                value={form.projectDescription}
                onChange={setField('projectDescription')}
                disabled={hasEnded}
                className={`${inputCls} resize-none ${errors.projectDescription ? errCls : ''} ${hasEnded ? 'bg-gray-50 text-gray-400' : ''}`}
              />
            </EditField>

            {/* Row 4: PI */}
            <EditField label="חוקר ראשי" error={errors.principalResearcherId} span={3} required>
              <PIPicker
                value={form.principalResearcherId}
                name={form.principalResearcherName}
                onChange={({ id, name }) =>
                  setForm((f) => ({ ...f, principalResearcherId: id, principalResearcherName: name }))
                }
                error={errors.principalResearcherId}
                allUsers={allUsers}
                loading={loadingMeta}
                disabled={hasEnded}
              />
            </EditField>

            {/* Row 5: Center + Funding */}
            <EditField label="מרכז מחקר" error={errors.centerId}>
              <MobileSelect
                value={form.centerId}
                onChange={(v) => setForm((f) => ({ ...f, centerId: v }))}
                placeholder="— בחר מרכז מחקר —"
                searchable
                searchPlaceholder="חיפוש מרכז לפי שם..."
                disabled={loadingMeta || hasEnded}
                options={centers.map((c) => ({ value: String(c.centerId), label: c.centerName }))}
                className={errors.centerId ? 'ring-1 ring-red-400 rounded-lg' : ''}
              />
            </EditField>

            <EditField label="מקור מימון" error={errors.fundingSource}>
              <input
                type="text"
                value={form.fundingSource}
                onChange={setField('fundingSource')}
                disabled={hasEnded}
                className={`${inputCls} ${errors.fundingSource ? errCls : ''} ${hasEnded ? 'bg-gray-50 text-gray-400' : ''}`}
              />
            </EditField>

            <EditField label="תקציב כולל (₪)" error={errors.totalBudget} required>
              <input
                type="number"
                min={0}
                value={form.totalBudget}
                onChange={setField('totalBudget')}
                disabled={hasEnded}
                className={`${inputCls} ${errors.totalBudget ? errCls : ''} ${hasEnded ? 'bg-gray-50 text-gray-400' : ''}`}
              />
            </EditField>

            {/* Row 6: Dates */}
            <EditField label="תאריך התחלה" error={errors.startDate} required>
              <HebrewDatePicker
                value={form.startDate}
                onChange={(iso) => setForm((f) => ({ ...f, startDate: iso }))}
                placeholder="בחר תאריך התחלה"
                disabled={hasEnded}
                className={`${inputCls} ${errors.startDate ? errCls : ''}`}
              />
            </EditField>

            <EditField label="תאריך סיום משוערך" error={errors.endDate} required>
              <HebrewDatePicker
                value={form.endDate}
                onChange={(iso) => setForm((f) => ({ ...f, endDate: iso }))}
                placeholder="בחר תאריך סיום"
                minDate={form.startDate}
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <h2 className="text-sm font-bold text-gray-800 tracking-wide">פרטי המחקר</h2>
          {!readOnly && (
            <button
              type="button"
              onClick={enterEdit}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              עריכה
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">

          {/* Section: name + ID */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1">שם המחקר</p>
              <p className="text-base font-bold text-gray-900 leading-snug">
                {detail.projectNameHe || detail.projectNameEn || '—'}
              </p>
              {detail.projectNameEn && detail.projectNameHe && (
                <p className="text-sm text-gray-400 mt-0.5 italic">{detail.projectNameEn}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1">מזהה</p>
              <span className="inline-block bg-primary/8 text-primary font-bold text-sm px-3 py-1 rounded-lg">
                #{detail.projectId}
              </span>
            </div>
          </div>

          {/* Description */}
          {detail.projectDescription && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1.5">תיאור</p>
              <p className="text-sm text-gray-700 leading-relaxed">{detail.projectDescription}</p>
            </div>
          )}

          {/* Section: people */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoChip
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              label="חוקר ראשי"
              value={detail.principalResearcherName || detail.principalResearcherId}
              accent
            />
            <InfoChip
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              label="מרכז מחקר"
              value={detail.centerName}
            />
            <InfoChip
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label="מקור מימון"
              value={detail.fundingSource}
            />
          </div>

          {/* Section: dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
            <DateChip label="יוצר" value={detail.createdByName} />
            <DateChip label="נוצר" value={fmtDate(detail.createdDate)} />
            <DateChip label="התחלה" value={fmtDate(detail.startDate)} highlight="green" />
            <DateChip label="סיום משוערך" value={fmtDate(detail.endDate)} highlight="red" />
          </div>

        </div>
      </div>

      <ResearchersCard detail={detail} />
      <AssistantsCard detail={detail} />
    </div>
  );
}

function InfoChip({ icon, label, value, accent }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3.5 border ${accent ? 'bg-primary/5 border-primary/15' : 'bg-gray-50 border-gray-100'}`}>
      <div className={`mt-0.5 flex-shrink-0 ${accent ? 'text-primary' : 'text-gray-400'}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-semibold truncate ${accent ? 'text-primary' : 'text-gray-800'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function DateChip({ label, value, highlight }) {
  const colors =
    highlight === 'green' ? 'text-green-600' :
    highlight === 'red'   ? 'text-red-500'   :
    'text-gray-800';
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${colors}`}>{value || '—'}</p>
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
          {detail.teamMembers.map((m) => {
            const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
            const isCreator = m.isCreator;
            const isPI      = m.isPrincipalInvestigator;
            return (
              <div
                key={m.userId}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                  isCreator ? 'bg-primary/5 border border-primary/15' : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                <UserAvatar userId={m.userId} firstName={m.firstName} lastName={m.lastName} size="lg" className={isCreator ? 'bg-primary text-white' : 'bg-gray-400 text-white'} />

                {/* Name + ID */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{fullName || m.userId}</p>
                  <p className="text-sm text-gray-400">{m.userId}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {/* Always show the project role */}
                  {m.projectRole && (
                    <span className={`text-sm px-2 py-0.5 rounded-full font-semibold ${
                      isCreator
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.projectRole}
                    </span>
                  )}
                  {/* PI badge shown in addition when the member is also PI */}
                  {isPI && (
                    <span className="text-sm bg-accent-light text-accent-dark px-2 py-0.5 rounded-full font-semibold">
                      חוקר ראשי
                    </span>
                  )}
                  {/* Creator indicator (small crown icon) */}
                  {isCreator && (
                    <span className="text-sm text-primary/60 font-medium">יוצר המחקר</span>
                  )}
                </div>
              </div>
            );
          })}
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
              <UserAvatar userId={a.assistantUserId} firstName={a.firstName} lastName={a.lastName} size="lg" className="bg-blue-50 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                <p className="text-sm text-gray-400">{a.assistantUserId}</p>
              </div>
              {a.salaryPerHour && (
                <span className="text-sm text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
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
