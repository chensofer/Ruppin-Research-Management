import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateMe, changePassword } from '../api/usersApi';
import Layout from '../components/Layout';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errCls   = 'border-red-400 focus:ring-red-400';

function Field({ label, children, error }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
  });
  const [profileErrors,  setProfileErrors]  = useState({});
  const [profileSaving,  setProfileSaving]  = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError,   setProfileError]   = useState('');

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors,  setPwErrors]  = useState({});
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError,   setPwError]   = useState('');

  // ── Profile handlers ──────────────────────────────────────────────────────────
  const validateProfile = () => {
    const e = {};
    if (!profile.firstName.trim()) e.firstName = 'שדה חובה';
    if (!profile.lastName.trim())  e.lastName  = 'שדה חובה';
    return e;
  };

  const handleProfileSave = async (ev) => {
    ev.preventDefault();
    const errs = validateProfile();
    if (Object.keys(errs).length > 0) { setProfileErrors(errs); return; }

    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await updateMe({
        firstName: profile.firstName.trim(),
        lastName:  profile.lastName.trim(),
        email:     profile.email.trim() || null,
      });
      updateUser({
        firstName: res.data.firstName,
        lastName:  res.data.lastName,
      });
      setProfileSuccess('הפרטים עודכנו בהצלחה');
    } catch (err) {
      setProfileError(err?.response?.data?.message ?? 'שגיאה בעדכון הפרטים');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Password handlers ─────────────────────────────────────────────────────────
  const validatePassword = () => {
    const e = {};
    if (!pwForm.current.trim()) e.current = 'שדה חובה';
    if (!pwForm.next.trim())    e.next    = 'שדה חובה';
    else if (pwForm.next.length < 6) e.next = 'סיסמה חייבת להכיל לפחות 6 תווים';
    if (pwForm.next !== pwForm.confirm) e.confirm = 'הסיסמאות אינן תואמות';
    return e;
  };

  const handlePasswordSave = async (ev) => {
    ev.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setPwSaving(true);
    setPwError('');
    setPwSuccess('');
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess('הסיסמה שונתה בהצלחה');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err?.response?.data?.message ?? 'שגיאה בשינוי הסיסמה');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">הפרופיל שלי</h1>

        {/* Profile details card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
            פרטים אישיים
          </h2>

          {profileError && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {profileSuccess}
            </p>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="שם פרטי" error={profileErrors.firstName}>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => { setProfile((f) => ({ ...f, firstName: e.target.value })); setProfileErrors((er) => ({ ...er, firstName: '' })); }}
                  className={`${inputCls} ${profileErrors.firstName ? errCls : ''}`}
                />
              </Field>
              <Field label="שם משפחה" error={profileErrors.lastName}>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => { setProfile((f) => ({ ...f, lastName: e.target.value })); setProfileErrors((er) => ({ ...er, lastName: '' })); }}
                  className={`${inputCls} ${profileErrors.lastName ? errCls : ''}`}
                />
              </Field>
            </div>
            <Field label="כתובת אימייל">
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@mail.com"
                className={inputCls}
              />
            </Field>
            <div>
              <label className="block text-xs text-gray-500 mb-1">מזהה משתמש</label>
              <p className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                {user?.userId}
              </p>
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {profileSaving ? 'שומר...' : 'שמור פרטים'}
            </button>
          </form>
        </div>

        {/* Change password card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
            שינוי סיסמה
          </h2>

          {pwError && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {pwSuccess}
            </p>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Field label="סיסמה נוכחית" error={pwErrors.current}>
              <input
                type="password"
                value={pwForm.current}
                onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwErrors((er) => ({ ...er, current: '' })); }}
                className={`${inputCls} ${pwErrors.current ? errCls : ''}`}
              />
            </Field>
            <Field label="סיסמה חדשה" error={pwErrors.next}>
              <input
                type="password"
                value={pwForm.next}
                onChange={(e) => { setPwForm((f) => ({ ...f, next: e.target.value })); setPwErrors((er) => ({ ...er, next: '' })); }}
                className={`${inputCls} ${pwErrors.next ? errCls : ''}`}
              />
            </Field>
            <Field label="אימות סיסמה חדשה" error={pwErrors.confirm}>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwErrors((er) => ({ ...er, confirm: '' })); }}
                className={`${inputCls} ${pwErrors.confirm ? errCls : ''}`}
              />
            </Field>
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {pwSaving ? 'שומר...' : 'שנה סיסמה'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
