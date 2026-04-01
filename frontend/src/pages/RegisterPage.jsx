import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register as registerApi } from '../api/authApi';
import Logo from '../components/Logo';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    systemAuthorization: 'Researcher',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await registerApi(form);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בהרשמה, נסה שנית');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">הרשמה למערכת</h1>
          <p className="text-gray-500 text-sm mb-6">צרו חשבון חדש</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>מספר זהות / מזהה משתמש</label>
              <input name="userId" value={form.userId} onChange={handleChange}
                required maxLength={10} placeholder="עד 10 תווים" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>שם פרטי</label>
                <input name="firstName" value={form.firstName} onChange={handleChange}
                  placeholder="שם פרטי" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>שם משפחה</label>
                <input name="lastName" value={form.lastName} onChange={handleChange}
                  placeholder="שם משפחה" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>אימייל</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="example@ruppin.ac.il" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>תפקיד במערכת</label>
              <select name="systemAuthorization" value={form.systemAuthorization}
                onChange={handleChange} className={inputClass}>
                <option value="Researcher">חוקר</option>
                <option value="CenterManager">מנהל מרכז</option>
                <option value="Admin">מנהל רשות המחקר</option>
                <option value="Assistant">עוזר מחקר</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>סיסמה</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                required minLength={6} placeholder="לפחות 6 תווים" className={inputClass} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm mt-2">
              {loading ? 'נרשם...' : 'הרשמה'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            כבר יש לכם חשבון?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              התחברות
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
