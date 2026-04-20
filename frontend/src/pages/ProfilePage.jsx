import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateMe, changePassword } from '../api/usersApi';
import Layout from '../components/Layout';

function Field({ label, children, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const profilePicKey = `profilePic_${user?.userId}`;
  const [profilePic, setProfilePic] = useState(
    () => (user?.userId ? localStorage.getItem(profilePicKey) : null)
  );

  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() ||
    (user?.userId?.[0] ?? '?').toUpperCase();

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

  // ── Profile picture ──────────────────────────────────────────────────────────
  const handlePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem(profilePicKey, dataUrl);
      setProfilePic(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePic = () => {
    localStorage.removeItem(profilePicKey);
    setProfilePic(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      updateUser({ firstName: res.data.firstName, lastName: res.data.lastName });
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
    else if (pwForm.next.length < 6) e.next = 'לפחות 6 תווים';
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
      <div className="max-w-lg mx-auto space-y-6" dir="rtl">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">הפרופיל שלי</h1>
          <p className="text-gray-500 text-sm mt-1">עדכון פרטים אישיים ותמונת פרופיל</p>
        </div>

        {/* Avatar card */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100 uppercase tracking-wide">
            תמונת פרופיל
          </h2>
          <div className="flex items-center gap-5">
            {/* Avatar preview */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/10">
                {profilePic ? (
                  <img src={profilePic} alt="תמונת פרופיל" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent flex items-center justify-center text-white text-2xl font-extrabold">
                    {initials}
                  </div>
                )}
              </div>
              {/* Camera overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-20 h-20 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                title="החלף תמונה"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePicChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-sm py-2 px-4"
              >
                העלה תמונה
              </button>
              {profilePic && (
                <button
                  type="button"
                  onClick={handleRemovePic}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  הסר תמונה
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG עד 5MB</p>
            </div>
          </div>
        </div>

        {/* Profile details card */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100 uppercase tracking-wide">
            פרטים אישיים
          </h2>

          {profileError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="mb-4 text-sm text-accent bg-accent-light border border-accent/20 rounded-xl px-4 py-3">
              ✓ {profileSuccess}
            </p>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="שם פרטי" error={profileErrors.firstName}>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => { setProfile((f) => ({ ...f, firstName: e.target.value })); setProfileErrors((er) => ({ ...er, firstName: '' })); }}
                  className={`input-field ${profileErrors.firstName ? 'border-red-400 focus:ring-red-400/30' : ''}`}
                />
              </Field>
              <Field label="שם משפחה" error={profileErrors.lastName}>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => { setProfile((f) => ({ ...f, lastName: e.target.value })); setProfileErrors((er) => ({ ...er, lastName: '' })); }}
                  className={`input-field ${profileErrors.lastName ? 'border-red-400 focus:ring-red-400/30' : ''}`}
                />
              </Field>
            </div>

            <Field label="כתובת אימייל">
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@mail.com"
                className="input-field"
              />
            </Field>

            <Field label="מזהה משתמש">
              <p className="input-field bg-gray-50 text-gray-400 cursor-not-allowed">
                {user?.userId}
              </p>
            </Field>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full btn-primary justify-center flex items-center gap-2"
            >
              {profileSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  שומר...
                </>
              ) : 'שמור פרטים'}
            </button>
          </form>
        </div>

        {/* Change password card */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100 uppercase tracking-wide">
            שינוי סיסמה
          </h2>

          {pwError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="mb-4 text-sm text-accent bg-accent-light border border-accent/20 rounded-xl px-4 py-3">
              ✓ {pwSuccess}
            </p>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Field label="סיסמה נוכחית" error={pwErrors.current}>
              <input
                type="password"
                value={pwForm.current}
                onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwErrors((er) => ({ ...er, current: '' })); }}
                className={`input-field ${pwErrors.current ? 'border-red-400 focus:ring-red-400/30' : ''}`}
              />
            </Field>
            <Field label="סיסמה חדשה" error={pwErrors.next}>
              <input
                type="password"
                value={pwForm.next}
                onChange={(e) => { setPwForm((f) => ({ ...f, next: e.target.value })); setPwErrors((er) => ({ ...er, next: '' })); }}
                className={`input-field ${pwErrors.next ? 'border-red-400 focus:ring-red-400/30' : ''}`}
              />
            </Field>
            <Field label="אימות סיסמה חדשה" error={pwErrors.confirm}>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwErrors((er) => ({ ...er, confirm: '' })); }}
                className={`input-field ${pwErrors.confirm ? 'border-red-400 focus:ring-red-400/30' : ''}`}
              />
            </Field>
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full btn-primary justify-center flex items-center gap-2"
            >
              {pwSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  שומר...
                </>
              ) : 'שנה סיסמה'}
            </button>
          </form>
        </div>

      </div>
    </Layout>
  );
}
