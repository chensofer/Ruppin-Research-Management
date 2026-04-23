import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api/authApi';
import Logo from '../components/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state ?? {};
  const [form, setForm] = useState({ userId: prefill.userId ?? '', password: prefill.password ?? '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data);
      navigate(res.data.systemAuthorization === 'עוזר מחקר' ? '/attendance' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 pb-4"
      dir="rtl"
      style={{ background: 'linear-gradient(145deg, #003478 0%, #001E50 55%, #001030 100%)', paddingTop: '40px' }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(92,184,0,0.12) 0%, transparent 70%)' }} />

      {/* ── Logo & title ── */}
      <div className="flex flex-col items-center text-center mb-8 select-none">
        <Logo size="lg" />
        <h1 className="text-white text-xl font-bold tracking-wide" style={{ marginTop: '10px' }}>מערכת ניהול מחקרים</h1>
        <p className="text-white/40 text-sm mt-1">המכללה האקדמית רופין</p>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Card top accent */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #5CB800 0%, #003478 100%)' }} />

        <div className="px-8 py-7">
          <div className="mb-6">
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
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="הכנס סיסמה"
                className="input-field"
              />
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

          <p className="text-center text-sm text-gray-400 mt-6">
            אין לכם חשבון?{' '}
            <Link to="/register" className="text-primary font-semibold hover:text-primary-dark transition-colors">
              הרשמה
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
