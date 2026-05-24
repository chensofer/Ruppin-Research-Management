import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../api/authApi';
import Logo from '../components/Logo';

export default function RegisterPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    systemAuthorization: 'חוקר',
    password: '',
  });
  const [profileImage, setProfileImage]     = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImage(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.userId.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('יש למלא את כל השדות');
      return;
    }
    if (!/^\d{9}$/.test(form.userId.trim())) {
      setError('מספר הזהות חייב להכיל בדיוק 9 ספרות');
      return;
    }
    setLoading(true);
    try {
      await registerApi(form);
      if (profileImage) {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            localStorage.setItem(`profilePic_${form.userId.trim()}`, reader.result);
            resolve();
          };
          reader.readAsDataURL(profileImage);
        });
      }
      navigate('/login', { state: { userId: form.userId.trim(), password: form.password } });
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בהרשמה, נסה שנית');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "input-field";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-3"
      dir="rtl"
      style={{ background: 'linear-gradient(145deg, #003478 0%, #001E50 55%, #001030 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(92,184,0,0.12) 0%, transparent 70%)' }} />

      {/* ── Logo & title ── */}
      <div className="flex flex-col items-center text-center mb-2 select-none">
        <Logo size="xs2" />
        <h1 className="text-white text-sm font-bold tracking-wide mt-1">מערכת ניהול מחקרים</h1>
        <p className="text-white/40 text-xs">המכללה האקדמית רופין</p>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Card top accent */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #5CB800 0%, #003478 100%)' }} />

        <div className="px-7 py-4">
          <div className="mb-3">
            <h2 className="text-xl font-extrabold text-gray-900">הרשמה למערכת</h2>
            <p className="text-gray-400 text-sm mt-0.5">צרו חשבון חדש</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">

            {/* Profile image */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-14 h-14 rounded-full border-2 border-dashed border-gray-300 hover:border-primary transition-colors overflow-hidden bg-gray-50 flex items-center justify-center group"
              >
                {profilePreview ? (
                  <img src={profilePreview} alt="תמונת פרופיל" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-primary transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                )}
                {profilePreview && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </button>
              <span className="text-xs text-gray-400">
                {profileImage ? profileImage.name : 'לחץ להוספת תמונת פרופיל (אופציונלי)'}
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            <div>
              <label className={labelClass}>מספר זהות</label>
              <input name="userId" value={form.userId} onChange={handleChange}
                required maxLength={9} placeholder="9 ספרות" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>שם פרטי</label>
                <input name="firstName" value={form.firstName} onChange={handleChange}
                  required placeholder="שם פרטי" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>שם משפחה</label>
                <input name="lastName" value={form.lastName} onChange={handleChange}
                  required placeholder="שם משפחה" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>אימייל</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                required placeholder="example@ruppin.ac.il" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>תפקיד במערכת</label>
              <select name="systemAuthorization" value={form.systemAuthorization}
                onChange={handleChange} className={inputClass}>
                <option value="חוקר">חוקר</option>
                <option value="מנהל מרכז">מנהל מרכז</option>
                <option value="עוזר מחקר">עוזר מחקר</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>סיסמה</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                required minLength={6} placeholder="לפחות 6 תווים" className={inputClass} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center flex items-center gap-2 mt-1 py-2.5">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  נרשם...
                </>
              ) : 'הרשמה'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-3">
            כבר יש לכם חשבון?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-dark transition-colors">
              התחברות
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
