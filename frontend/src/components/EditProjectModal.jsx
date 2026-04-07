import { useEffect, useState } from 'react';
import { getProjectDetail, updateProject, getBudgetCategories, updateBudgetCategories } from '../api/projectsApi';
import { getUsers } from '../api/usersApi';
import { getCenters } from '../api/centersApi';
import CategoryPicker from './CreateProjectModal/CategoryPicker';

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errorCls = 'border-red-400 focus:ring-red-400';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n ?? 0)}`;

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Tab: Research Details ─────────────────────────────────────────────────────

function DetailsTab({ form, setForm, errors, allUsers, usersLoading, centers }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const [piQuery, setPiQuery]       = useState('');
  const [showPiDrop, setShowPiDrop] = useState(false);

  const piFiltered = allUsers
    .filter((u) => {
      if (u.systemAuthorization === 'עוזר מחקר') return false;
      if (!piQuery) return true;
      const q = piQuery.toLowerCase();
      return u.userId.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const selectPI = (user) => {
    setForm((f) => ({
      ...f,
      principalResearcherId: user.userId,
      principalResearcherName: `${user.firstName} ${user.lastName}`,
      principalResearcherRole: user.systemAuthorization,
    }));
    setPiQuery('');
    setShowPiDrop(false);
  };

  const clearPI = () =>
    setForm((f) => ({ ...f, principalResearcherId: '', principalResearcherName: '', principalResearcherRole: '' }));

  return (
    <div className="space-y-4">
      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="שם מחקר" required error={errors.projectNameHe}>
          <input type="text" value={form.projectNameHe} onChange={set('projectNameHe')}
            placeholder="שם מחקר בעברית"
            className={`${inputCls} ${errors.projectNameHe ? errorCls : ''}`} />
        </Field>
        <Field label="שם מחקר באנגלית">
          <input type="text" value={form.projectNameEn} onChange={set('projectNameEn')}
            placeholder="Research name in English" className={inputCls} />
        </Field>
      </div>

      {/* Principal researcher */}
      <Field label="חוקר ראשי" required error={errors.principalResearcherId}>
        {form.principalResearcherId ? (
          <div className={`flex items-center gap-3 bg-primary-light border rounded-lg px-3 py-2.5 ${errors.principalResearcherId ? 'border-red-400' : 'border-primary/20'}`}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {form.principalResearcherName?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{form.principalResearcherName}</p>
              <p className="text-xs text-primary/60">ת"ז - {form.principalResearcherId}</p>
            </div>
            {form.principalResearcherRole && (
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full flex-shrink-0">
                {form.principalResearcherRole}
              </span>
            )}
            <button type="button" onClick={clearPI} className="text-primary/40 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input type="text" value={piQuery}
              onChange={(e) => { setPiQuery(e.target.value); setShowPiDrop(true); }}
              onFocus={() => setShowPiDrop(true)}
              onBlur={() => setTimeout(() => setShowPiDrop(false), 150)}
              placeholder={usersLoading ? 'טוען...' : 'חפש חוקר לפי שם או ת.ז...'}
              disabled={usersLoading}
              className={`${inputCls} ${errors.principalResearcherId ? errorCls : ''}`} />
            {showPiDrop && !usersLoading && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {piFiltered.length > 0 ? piFiltered.map((u) => (
                  <li key={u.userId} onMouseDown={() => selectPI(u)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">ת"ז - {u.userId}</p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {u.systemAuthorization}
                    </span>
                  </li>
                )) : (
                  <li className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</li>
                )}
              </ul>
            )}
          </div>
        )}
      </Field>

      {/* Research center */}
      <Field label="מרכז מחקר">
        <select value={form.centerId} onChange={set('centerId')} className={inputCls}>
          <option value="">— ללא שיוך למרכז מחקר —</option>
          {centers.map((c) => (
            <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
          ))}
        </select>
      </Field>

      {/* Budget + Funding source */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="תקציב מאושר (₪)" required error={errors.totalBudget}>
          <input type="number" min={0} value={form.totalBudget} onChange={set('totalBudget')}
            placeholder="0" className={`${inputCls} ${errors.totalBudget ? errorCls : ''}`} />
        </Field>
        <Field label="מקור מימון">
          <input type="text" value={form.fundingSource} onChange={set('fundingSource')}
            placeholder="לדוגמה: קרן מדע, ISF..." className={inputCls} />
        </Field>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="תאריך התחלה" required error={errors.startDate}>
          <input type="date" value={form.startDate} onChange={set('startDate')}
            className={`${inputCls} ${errors.startDate ? errorCls : ''}`} />
        </Field>
        <Field label="תאריך סיום משוער" required error={errors.endDate}>
          <input type="date" value={form.endDate} onChange={set('endDate')}
            className={`${inputCls} ${errors.endDate ? errorCls : ''}`} />
        </Field>
      </div>

      {/* Description */}
      <Field label="תיאור המחקר">
        <textarea rows={3} value={form.projectDescription} onChange={set('projectDescription')}
          placeholder="תאר בקצרה את נושא המחקר..."
          className={`${inputCls} resize-none`} />
      </Field>
    </div>
  );
}

// ─── Tab: Budget Categories ────────────────────────────────────────────────────

function BudgetTab({ categories, setCategories, totalBudget, errors }) {
  const [draft, setDraft] = useState({ categoryName: '', allocatedAmount: '' });

  const totalBudgetNum = parseFloat(totalBudget) || 0;
  const totalAllocated = categories.reduce((s, c) => s + (parseFloat(c.allocatedAmount) || 0), 0);
  const remaining      = totalBudgetNum > 0 ? totalBudgetNum - totalAllocated : null;
  const balanced       = totalBudgetNum > 0 && Math.abs(totalAllocated - totalBudgetNum) <= 0.01;

  const exceedsDraft = remaining !== null && (parseFloat(draft.allocatedAmount) || 0) > remaining + 0.01;

  const addRow = () => {
    if (!draft.categoryName.trim() || exceedsDraft) return;
    setCategories((prev) => [...prev, { ...draft, _key: crypto.randomUUID() }]);
    setDraft({ categoryName: '', allocatedAmount: '' });
  };

  const removeRow = (key) => setCategories((prev) => prev.filter((c) => c._key !== key));

  return (
    <div className="space-y-4">
      {errors.budgetBalance && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {errors.budgetBalance}
        </div>
      )}

      {/* Balance indicator */}
      {totalBudgetNum > 0 && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
          balanced ? 'bg-green-50 border-green-200' :
          remaining > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
        }`}>
          <span className={`text-sm font-semibold ${
            balanced ? 'text-green-700' : remaining > 0 ? 'text-blue-700' : 'text-red-700'
          }`}>
            {balanced ? 'התקציב מאוזן במלואו ✓' :
             remaining > 0 ? `נותר לחלוקה: ${fmt(remaining)}` :
             `חריגה מהתקציב: ${fmt(Math.abs(remaining))}`}
          </span>
          <span className="text-xs text-gray-500">מתוך {fmt(totalBudgetNum)}</span>
        </div>
      )}

      {/* Add row */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">הוסף קטגוריית תקציב</h3>
        <CategoryPicker
          value={draft.categoryName}
          onChange={(v) => setDraft((d) => ({ ...d, categoryName: v }))}
          placeholder="בחר קטגוריית תקציב"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <input type="number" min={0} value={draft.allocatedAmount}
              onChange={(e) => setDraft((d) => ({ ...d, allocatedAmount: e.target.value }))}
              placeholder="סכום מוקצה (₪)"
              className={`${inputCls} ${exceedsDraft ? errorCls : ''}`} />
            {exceedsDraft && (
              <p className="text-xs text-red-500 mt-1">הסכום חורג מהתקציב הפנוי ({fmt(remaining)})</p>
            )}
          </div>
          <button type="button" onClick={addRow}
            disabled={!draft.categoryName.trim() || exceedsDraft}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap">
            + הוסף
          </button>
        </div>
      </div>

      {/* Category list */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">קטגוריות ({categories.length})</p>
          {categories.map((c) => (
            <div key={c._key ?? c.researchBudgetCategoryId}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">{c.categoryName}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">
                  {c.allocatedAmount ? fmt(parseFloat(c.allocatedAmount)) : '—'}
                </span>
                <button type="button" onClick={() => removeRow(c._key ?? c.researchBudgetCategoryId)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-800">{totalBudgetNum > 0 ? fmt(totalBudgetNum) : '—'}</span>
          <span className="text-gray-500">:תקציב מאושר</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={`font-semibold ${!balanced && totalBudgetNum > 0 ? 'text-orange-600' : 'text-primary'}`}>
            {fmt(totalAllocated)}
          </span>
          <span className="text-gray-500">:סה״כ קטגוריות</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'details', label: 'פרטי מחקר' },
  { id: 'budget',  label: 'הגדרת תקציב' },
];

const EMPTY_FORM = {
  projectNameHe: '',
  projectNameEn: '',
  projectDescription: '',
  totalBudget: '',
  fundingSource: '',
  startDate: '',
  endDate: '',
  principalResearcherId: '',
  principalResearcherName: '',
  principalResearcherRole: '',
  centerId: '',
  status: '',
};

export default function EditProjectModal({ projectId, onClose, onSaved }) {
  const [tab, setTab]             = useState('details');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors]       = useState({});
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');

  const [allUsers, setAllUsers]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [centers, setCenters]       = useState([]);

  // Load project detail + categories + reference data on mount
  useEffect(() => {
    Promise.all([
      getProjectDetail(projectId),
      getBudgetCategories(projectId),
      getUsers(),
      getCenters(),
    ])
      .then(([detailRes, catRes, usersRes, centersRes]) => {
        const d = detailRes.data;
        setForm({
          projectNameHe:          d.projectNameHe ?? '',
          projectNameEn:          d.projectNameEn ?? '',
          projectDescription:     d.projectDescription ?? '',
          totalBudget:            d.totalBudget ?? '',
          fundingSource:          d.fundingSource ?? '',
          startDate:              d.startDate ?? '',
          endDate:                d.endDate ?? '',
          principalResearcherId:  d.principalResearcherId ?? '',
          principalResearcherName: d.principalResearcherName ?? '',
          principalResearcherRole: '',   // resolved below
          centerId:               d.centerId ?? '',
          status:                 d.status ?? '',
        });

        // Resolve PI role from the loaded users list
        const piUser = usersRes.data.find((u) => u.userId === d.principalResearcherId);
        if (piUser) {
          setForm((f) => ({ ...f, principalResearcherRole: piUser.systemAuthorization ?? '' }));
        }

        // Add a stable _key to each loaded category for list keying
        setCategories(
          catRes.data.map((c) => ({ ...c, _key: String(c.researchBudgetCategoryId) }))
        );
        setAllUsers(usersRes.data);
        setCenters(centersRes.data);
      })
      .catch(() => setLoadError('שגיאה בטעינת נתוני המחקר'))
      .finally(() => { setLoading(false); setUsersLoading(false); });
  }, [projectId]);

  const validate = () => {
    const errs = {};
    if (!form.projectNameHe.trim())
      errs.projectNameHe = 'שם המחקר הוא שדה חובה';
    if (!form.principalResearcherId)
      errs.principalResearcherId = 'יש לבחור חוקר ראשי';
    if (!form.startDate)
      errs.startDate = 'תאריך התחלה הוא שדה חובה';
    if (!form.endDate)
      errs.endDate = 'תאריך סיום הוא שדה חובה';
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      errs.endDate = 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
    if (!form.totalBudget || parseFloat(form.totalBudget) <= 0)
      errs.totalBudget = 'יש להזין תקציב תקין';

    // Budget balance check
    const totalBudgetNum = parseFloat(form.totalBudget) || 0;
    const totalAllocated = categories.reduce((s, c) => s + (parseFloat(c.allocatedAmount) || 0), 0);
    if (categories.length > 0 && totalBudgetNum > 0 && Math.abs(totalAllocated - totalBudgetNum) > 0.01) {
      errs.budgetBalance = 'יש לאזן את התקציב במלואו לפני השמירה';
    }

    setErrors(errs);
    // If budget error, switch to budget tab automatically
    if (errs.budgetBalance && !errs.projectNameHe && !errs.principalResearcherId &&
        !errs.startDate && !errs.endDate && !errs.totalBudget) {
      setTab('budget');
    } else if (Object.keys(errs).some((k) => k !== 'budgetBalance')) {
      setTab('details');
    }
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');

    try {
      await updateProject(projectId, {
        projectNameHe:         form.projectNameHe,
        projectNameEn:         form.projectNameEn || null,
        projectDescription:    form.projectDescription || null,
        totalBudget:           parseFloat(form.totalBudget) || null,
        fundingSource:         form.fundingSource || null,
        startDate:             form.startDate || null,
        endDate:               form.endDate || null,
        principalResearcherId: form.principalResearcherId || null,
        centerId:              form.centerId ? parseInt(form.centerId) : null,
        status:                form.status || null,
      });

      await updateBudgetCategories(
        projectId,
        categories.map((c) => ({
          categoryName:    c.categoryName,
          allocatedAmount: parseFloat(c.allocatedAmount) || null,
        }))
      );

      onSaved();
    } catch (err) {
      const msg = err.response?.data?.message ?? 'אירעה שגיאה בשמירה. נסה שוב.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900">עריכת מחקר</h2>
            {form.projectNameHe && (
              <p className="text-xs text-gray-500 mt-0.5">{form.projectNameHe}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {/* Show dot if that tab has errors */}
              {((t.id === 'details' && Object.keys(errors).some((k) => k !== 'budgetBalance')) ||
                (t.id === 'budget' && errors.budgetBalance)) && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 mb-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {loadError}
            </div>
          )}

          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {saveError}
            </div>
          )}

          {!loading && !loadError && (
            <>
              {tab === 'details' && (
                <DetailsTab
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  allUsers={allUsers}
                  usersLoading={usersLoading}
                  centers={centers}
                />
              )}
              {tab === 'budget' && (
                <BudgetTab
                  categories={categories}
                  setCategories={setCategories}
                  totalBudget={form.totalBudget}
                  errors={errors}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            ביטול
          </button>
          <button type="button" onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                שמור שינויים
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
