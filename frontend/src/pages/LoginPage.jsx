import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api/authApi';
import Logo from '../components/Logo';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const from = location.state?.from ?? null;
  const prefill = typeof location.state === 'object' && !location.state?.from ? (location.state ?? {}) : {};
  const [form, setForm] = useState({ userId: prefill.userId ?? '', password: prefill.password ?? '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // אם כבר מחובר: מזכירות עם requestId — מפנה ישירות לבקשה.
  // כל תפקיד אחר עם requestId — נשאר בדף ההתחברות (כי הלינק מיועד למזכירות).
  useEffect(() => {
    if (!user) return;
    if (requestId) {
      if (user.systemAuthorization === 'מזכירות') {
        navigate(`/approvals?requestId=${requestId}`, { replace: true });
      }
      return;
    }
    navigate(user.systemAuthorization === 'עוזר מחקר' ? '/attendance' : user.systemAuthorization === 'מזכירות' ? (from ?? '/approvals') : '/dashboard', { replace: true });
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data);
      const role = res.data.systemAuthorization;
      if (requestId && role === 'מזכירות') {
        navigate(`/approvals?requestId=${requestId}`, { replace: true });
      } else {
        navigate(role === 'עוזר מחקר' ? '/attendance' : role === 'מזכירות' ? (from ?? '/approvals') : '/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-4"
      dir="rtl"
      style={{ background: 'linear-gradient(145deg, #003478 0%, #001E50 55%, #001030 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(92,184,0,0.12) 0%, transparent 70%)' }} />

      {/* ── Logo & title ── */}
      <div className="flex flex-col items-center text-center mb-3 select-none">
        <Logo size="sm" />
        <h1 className="text-white text-base font-bold tracking-wide mt-1.5">מערכת ניהול מחקרים</h1>
        <p className="text-white/40 text-sm mt-0.5">המכללה האקדמית רופין</p>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Card top accent */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #5CB800 0%, #003478 100%)' }} />

        <div className="px-8 py-5">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-gray-900">ברוכים הבאים</h2>
            <p className="text-gray-400 text-sm mt-1">התחברו למערכת ניהול המחקר</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                מספר זהות / מזהה משתמש
              </label>
              <input
                name="userId"
                value={form.userId}
                onChange={handleChange}
                required
                maxLength={10}
                placeholder="הכנס מזהה משתמש"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                סיסמה
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="הכנס סיסמה"
                  className="input-field pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center flex items-center gap-2 mt-1 text-base py-2.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  מתחבר...
                </>
              ) : 'התחברות'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">
              אין לכם חשבון?{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                הרשמה
              </Link>
            </p>
            <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-primary transition-colors">
              שכחתי סיסמה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
