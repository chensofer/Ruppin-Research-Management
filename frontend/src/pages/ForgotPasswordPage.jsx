import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/authApi';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ userId: userId.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשליחת הבקשה');
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
      <div className="fixed top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />

      <div className="flex flex-col items-center text-center mb-3 select-none">
        <Logo size="sm" />
        <h1 className="text-white text-base font-bold tracking-wide mt-1.5">מערכת ניהול מחקרים</h1>
        <p className="text-white/40 text-sm mt-0.5">המכללה האקדמית רופין</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #5CB800 0%, #003478 100%)' }} />

        <div className="px-8 py-5">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">המייל נשלח!</h2>
              <p className="text-sm text-gray-500 mb-5">בדוק/י את תיבת הדואר שלך ולחץ/י על הקישור לאיפוס הסיסמה. הקישור בתוקף לשעה אחת.</p>
              <Link to="/login" className="text-primary font-semibold text-sm hover:underline">חזרה להתחברות</Link>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-extrabold text-gray-900">שכחתי סיסמה</h2>
                <p className="text-gray-400 text-sm mt-1">הכנס/י את מספר הזהות שלך ונשלח קישור לאיפוס</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    מספר זהות / מזהה משתמש
                  </label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    maxLength={10}
                    placeholder="הכנס מזהה משתמש"
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
                      שולח...
                    </>
                  ) : 'שלח קישור לאיפוס'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-4">
                <Link to="/login" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                  חזרה להתחברות
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
