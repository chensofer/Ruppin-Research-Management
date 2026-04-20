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
    <div className="min-h-screen flex" dir="rtl">
      {/* Right panel — decorative navy */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #003478 0%, #001E50 60%, #001440 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #5CB800 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h2 className="text-white text-2xl font-bold mt-8 leading-snug">
            מערכת ניהול מחקרים
          </h2>
          <p className="text-white/60 text-sm mt-3 max-w-xs leading-relaxed">
            ניהול מחקרים, תקציבים, עוזרי מחקר ואישור דוחות — הכל במקום אחד
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: '📊', text: 'ניהול תקציב בזמן אמת' },
              { icon: '👥', text: 'צוות ועוזרי מחקר' },
              { icon: '✅', text: 'אישור דוחות נוכחות' },
            ].map((f) => (
              <div key={f.text}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-right">
                <span className="text-lg">{f.icon}</span>
                <span className="text-white/80 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Left panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-page-bg p-6">
        <div className="w-full max-w-sm">
          {/* Logo on mobile only */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold text-gray-900">ברוכים הבאים</h1>
              <p className="text-gray-500 text-sm mt-1">התחברו למערכת ניהול המחקר</p>
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
                className="w-full btn-primary justify-center flex items-center gap-2 mt-1 text-base"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    מתחבר...
                  </>
                ) : 'התחברות'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              אין לכם חשבון?{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                הרשמה
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
