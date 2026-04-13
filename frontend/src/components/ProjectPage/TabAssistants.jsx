import { useState, useEffect } from 'react';
import { getUsers } from '../../api/usersApi';
import {
  addAssistant,
  createAndAddAssistant,
  removeAssistant,
  updateAssistant,
  getAssistantTracking,
} from '../../api/projectsApi';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const fmt = (n) =>
  n != null
    ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`
    : '—';

const MONTH_NAMES = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

function statusBadge(status) {
  const map = {
    'ממתין': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'אושר':  'bg-green-50 text-green-700 border-green-200',
    'נדחה':  'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status ?? '—'}
    </span>
  );
}

// ── Create-new-assistant modal ─────────────────────────────────────────────────
function CreateAssistantModal({ onClose, onCreated, projectId }) {
  const EMPTY = { userId: '', firstName: '', lastName: '', email: '', salary: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e = {};
    if (!form.userId.trim())     e.userId    = 'שדה חובה';
    if (!form.firstName.trim())  e.firstName = 'שדה חובה';
    if (!form.lastName.trim())   e.lastName  = 'שדה חובה';
    if (!form.email.trim())      e.email     = 'שדה חובה';
    if (!form.salary || parseFloat(form.salary) <= 0) e.salary = 'יש להזין שכר חיובי';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setServerError('');
    try {
      const result = await createAndAddAssistant(projectId, {
        userId:       form.userId.trim(),
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        email:        form.email.trim(),
        salaryPerHour: parseFloat(form.salary),
      });
      onCreated(result.data);
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'שגיאה ביצירת עוזר מחקר');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">יצירת עוזר מחקר חדש</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <Field
            label="תעודת זהות / מספר עובד"
            name="userId"
            value={form.userId}
            onChange={handleChange}
            error={errors.userId}
            placeholder="לדוגמה: 123456789"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם פרטי"  name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} />
            <Field label="שם משפחה" name="lastName"  value={form.lastName}  onChange={handleChange} error={errors.lastName} />
          </div>
          <Field
            label="כתובת אימייל"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="example@mail.com"
          />
          <Field
            label="שכר לשעה (₪)"
            name="salary"
            type="number"
            min="0"
            step="0.01"
            value={form.salary}
            onChange={handleChange}
            error={errors.salary}
            placeholder="לדוגמה: 45"
          />

          <p className="text-xs text-gray-400">
            הסיסמה הראשונית של המשתמש תהיה מספר הזהות / העובד שלו.
          </p>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'צור והוסף'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, error, type = 'text', placeholder, min, step }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── Edit-assistant modal ────────────────────────────────────────────────────────
function EditAssistantModal({ assistant, projectId, onClose, onSaved }) {
  const [form, setForm] = useState({
    email: assistant.email ?? '',
    salary: assistant.salaryPerHour?.toString() ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e = {};
    if (form.salary && parseFloat(form.salary) <= 0) e.salary = 'שכר לשעה חייב להיות גדול מאפס';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setServerError('');
    try {
      await updateAssistant(projectId, assistant.assistantUserId, {
        email: form.email.trim() || null,
        salaryPerHour: form.salary ? parseFloat(form.salary) : null,
      });
      onSaved();
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'שגיאה בעדכון פרטי עוזר המחקר');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            עריכת עוזר מחקר — {assistant.firstName} {assistant.lastName}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}
          <Field
            label="כתובת אימייל"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="example@mail.com"
          />
          <Field
            label="שכר לשעה (₪)"
            name="salary"
            type="number"
            min="0"
            step="0.01"
            value={form.salary}
            onChange={handleChange}
            error={errors.salary}
            placeholder="לדוגמה: 45"
          />
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tracking modal ─────────────────────────────────────────────────────────────
function TrackingModal({ assistant, projectId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    getAssistantTracking(projectId, assistant.assistantUserId)
      .then((r) => setData(r.data))
      .catch(() => setError('שגיאה בטעינת הנתונים'))
      .finally(() => setLoading(false));
  }, [projectId, assistant.assistantUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              מעקב עוזר מחקר — {assistant.firstName} {assistant.lastName}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {assistant.assistantUserId}
              {assistant.salaryPerHour ? ` · ${fmt(assistant.salaryPerHour)}/שעה` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {data && (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="סה״כ שעות" value={data.totalHours ? `${data.totalHours}` : '0'} sub="שעות מדווחות" />
                <StatCard label="סה״כ שולם" value={fmt(data.totalPaid)} color="text-green-600" />
                <StatCard label="ממתין לאישור" value={fmt(data.totalPending)} color="text-yellow-600" />
              </div>

              {/* Monthly approvals */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  אישורים חודשיים ({data.monthlyApprovals.length})
                </h3>
                {data.monthlyApprovals.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">אין אישורים חודשיים</p>
                ) : (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-4 py-2.5 text-right font-medium">חודש</th>
                          <th className="px-4 py-2.5 text-right font-medium">שעות</th>
                          <th className="px-4 py-2.5 text-right font-medium">סכום</th>
                          <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                          <th className="px-4 py-2.5 text-right font-medium">תאריך אישור</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.monthlyApprovals.map((m) => (
                          <tr key={m.monthlyApprovalId} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {m.month && m.year
                                ? `${MONTH_NAMES[m.month - 1]} ${m.year}`
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">{m.totalWorkedHours ?? '—'}</td>
                            <td className="px-4 py-2.5 text-gray-700">{fmt(m.totalPaymentAmount)}</td>
                            <td className="px-4 py-2.5">{statusBadge(m.approvalStatus)}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{m.approvalDate ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Individual hour reports (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowReports((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showReports ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  דוח שעות יומי — טרם שליחה לאישור ({data.hourReports.length})
                </button>

                {showReports && (
                  <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
                    {data.hourReports.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-400">אין דיווחי שעות ממתינים לשליחה</p>
                        <p className="text-xs text-gray-300 mt-1">כל הדיווחים נשלחו לאישור או אושרו</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500">
                          <tr>
                            <th className="px-4 py-2.5 text-right font-medium">תאריך</th>
                            <th className="px-4 py-2.5 text-right font-medium">משעה</th>
                            <th className="px-4 py-2.5 text-right font-medium">עד שעה</th>
                            <th className="px-4 py-2.5 text-right font-medium">שעות</th>
                            <th className="px-4 py-2.5 text-right font-medium">הערות</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.hourReports.map((r) => (
                            <tr key={r.hourReportId} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800">{r.reportDate ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-600">{r.fromHour ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-600">{r.toHour ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-700">{r.workedHours ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[140px]">
                                {r.comments || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 text-left">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900', sub }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TabAssistants({ projectId, assistants, onChanged }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [stagedUser, setStagedUser] = useState(null);
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);     // assistantUserId
  const [trackingAssistant, setTrackingAssistant] = useState(null); // full assistant object
  const [editAssistant, setEditAssistant] = useState(null);     // full assistant object

  useEffect(() => {
    getUsers()
      .then((r) => setAllUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = new Set(assistants.map((a) => a.assistantUserId));

  const filtered = allUsers.filter((u) => {
    if (selectedIds.has(u.userId)) return false;
    if (stagedUser && u.userId === stagedUser.userId) return false;
    if (u.systemAuthorization !== 'עוזר מחקר') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.userId.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
  });

  const displayed = query ? filtered : filtered.slice(0, 10);

  const stageUser = (user) => {
    setStagedUser(user);
    setQuery(`${user.firstName} ${user.lastName}`);
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!stagedUser) return;
    setSaving(true);
    setError('');
    try {
      await addAssistant(projectId, {
        assistantUserId: stagedUser.userId,
        role: 'עוזר מחקר',
        salaryPerHour: salary ? parseFloat(salary) : null,
      });
      setStagedUser(null);
      setSalary('');
      setQuery('');
      onChanged();
    } catch {
      setError('שגיאה בהוספת עוזר מחקר');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    setSaving(true);
    setError('');
    try {
      await removeAssistant(projectId, userId);
      onChanged();
    } catch {
      setError('שגיאה בהסרת עוזר מחקר');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add existing assistant panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            צור עוזר מחקר חדש
          </button>
          <h3 className="text-sm font-semibold text-gray-700">הוסף עוזר מחקר קיים</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setStagedUser(null); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={loading ? 'טוען...' : 'חפש עוזר מחקר לפי שם או ת.ז...'}
            disabled={loading || saving}
            className={inputCls}
          />
          {showDropdown && !loading && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {displayed.length > 0 ? displayed.map((u) => (
                <li key={u.userId} onMouseDown={() => stageUser(u)}
                  className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex justify-between items-center">
                  <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                  <span className="text-xs text-gray-400">{u.userId}</span>
                </li>
              )) : (
                <li className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו עוזרי מחקר</li>
              )}
            </ul>
          )}
        </div>

        {/* Staged user — salary + add button */}
        {stagedUser && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {(stagedUser.firstName?.[0] ?? '') + (stagedUser.lastName?.[0] ?? '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{stagedUser.firstName} {stagedUser.lastName}</p>
              <p className="text-xs text-gray-400">{stagedUser.userId}</p>
            </div>
            <input
              type="number"
              min={0}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="₪/שעה"
              className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              הוסף
            </button>
            <button
              type="button"
              onClick={() => { setStagedUser(null); setQuery(''); }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Assistants list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 text-right">
          <span className="text-sm font-semibold text-gray-700">עוזרי מחקר ({assistants.length})</span>
        </div>
        {assistants.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">אין עוזרי מחקר עדיין</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assistants.map((a) => (
              <div key={a.assistantUserId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                  {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-gray-400">{a.assistantUserId} · {a.role}</p>
                </div>
                {a.salaryPerHour && (
                  <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                    {fmt(a.salaryPerHour)}/שעה
                  </span>
                )}
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => setEditAssistant(a)}
                  title="עריכה"
                  className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {/* View tracking */}
                <button
                  type="button"
                  onClick={() => setTrackingAssistant(a)}
                  title="פרטים ומעקב"
                  className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => setConfirmRemove(a.assistantUserId)}
                  disabled={saving}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm removal dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">הסרת עוזר מחקר</h3>
            <p className="text-sm text-gray-600 mb-6">
              האם אתה בטוח שברצונך להסיר את עוזר המחקר מהמחקר?
            </p>
            <div className="flex gap-3 justify-start">
              <button
                type="button"
                onClick={() => { handleRemove(confirmRemove); setConfirmRemove(null); }}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                הסר
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new assistant modal */}
      {showCreateModal && (
        <CreateAssistantModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); onChanged(); }}
        />
      )}

      {/* Edit assistant modal */}
      {editAssistant && (
        <EditAssistantModal
          assistant={editAssistant}
          projectId={projectId}
          onClose={() => setEditAssistant(null)}
          onSaved={() => { setEditAssistant(null); onChanged(); }}
        />
      )}

      {/* Tracking view modal */}
      {trackingAssistant && (
        <TrackingModal
          assistant={trackingAssistant}
          projectId={projectId}
          onClose={() => setTrackingAssistant(null)}
        />
      )}
    </div>
  );
}
