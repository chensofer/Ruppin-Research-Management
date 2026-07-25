import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { getUsers, getRoles, createUser, updateUserRole, deleteUser } from '../api/usersApi';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  'מזכירות': 'מזכירות',
  'מנהל מרכז': 'מנהל מרכז',
  'עוזר מחקר': 'עוזר מחקר',
};

const ROLE_COLORS = {
  'מזכירות':    'bg-purple-100 text-purple-700',
  'מנהל מרכז':  'bg-blue-100 text-blue-700',
  'עוזר מחקר':  'bg-green-100 text-green-700',
};

const ALL_ROLES = ['מנהל מרכז', 'מזכירות', 'עוזר מחקר'];

const EMPTY_FORM = { userId: '', firstName: '', lastName: '', email: '', systemAuthorization: 'מנהל מרכז', password: '' };

function RoleBadge({ role }) {
  const cls = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block text-sm font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {role || '—'}
    </span>
  );
}

function CreateUserModal({ onClose, onCreated, allRoles }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId.trim()) { setError('מזהה משתמש הוא שדה חובה'); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('שם פרטי ושם משפחה הם שדות חובה'); return; }
    setSaving(true);
    try {
      await createUser({
        userId: form.userId.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || null,
        systemAuthorization: form.systemAuthorization,
        password: form.password.trim() || null,
      });
      toast.success('המשתמש נוצר בהצלחה');
      onCreated();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'שגיאה ביצירת המשתמש';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-white text-gray-800 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">הוספת משתמש חדש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">שם פרטי *</label>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                className={inputCls} placeholder="ישראל" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">שם משפחה *</label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                className={inputCls} placeholder="ישראלי" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">מזהה משתמש (ת.ז.) *</label>
            <input value={form.userId} onChange={(e) => set('userId', e.target.value)}
              className={inputCls} placeholder="123456789" maxLength={10} />
            <p className="text-sm text-gray-400 mt-1">ברירת מחדל: הסיסמה תהיה מזהה המשתמש</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">דוא״ל</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className={inputCls} placeholder="user@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">תפקיד *</label>
            <select value={form.systemAuthorization} onChange={(e) => set('systemAuthorization', e.target.value)}
              className={inputCls}>
              {(allRoles.length > 0 ? allRoles : ALL_ROLES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">סיסמה ראשונית</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              className={inputCls} placeholder="ריק = מזהה המשתמש" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'צור משתמש'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({ user, onClose, onUpdated, allRoles }) {
  const [role, setRole] = useState(user.systemAuthorization || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserRole(user.userId, role);
      toast.success('התפקיד עודכן בהצלחה');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'שגיאה בעדכון התפקיד');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">עדכון תפקיד</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            עדכון תפקיד עבור: <span className="font-semibold">{user.firstName} {user.lastName}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">תפקיד חדש</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white text-gray-800 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {(allRoles.length > 0 ? allRoles : ALL_ROLES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              ביטול
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'שמור'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(),
        getRoles().catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch {
      toast.error('שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`למחוק את המשתמש ${name}? פעולה זו אינה הפיכה.`)) return;
    setDeletingId(userId);
    try {
      await deleteUser(userId);
      toast.success('המשתמש נמחק');
      setUsers((prev) => prev.filter((u) => u.userId.trim() !== userId.trim()));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'שגיאה במחיקת המשתמש');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.userId ?? ''} ${u.email ?? ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = !roleFilter || u.systemAuthorization === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">ניהול משתמשים</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">{users.length} משתמשים רשומים במערכת</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הוסף משתמש
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, ת.ז. או דוא״ל..."
            className="flex-1 bg-white text-gray-800 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-400"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white text-gray-800 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:w-44"
          >
            <option value="">כל התפקידים</option>
            {(roles.length > 0 ? roles : ALL_ROLES).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">לא נמצאו משתמשים</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right text-sm font-semibold text-gray-500 px-3 sm:px-5 py-3">שם</th>
                    <th className="text-right text-sm font-semibold text-gray-500 px-3 sm:px-5 py-3 hidden sm:table-cell">ת.ז.</th>
                    <th className="text-right text-sm font-semibold text-gray-500 px-3 sm:px-5 py-3 hidden sm:table-cell">דוא״ל</th>
                    <th className="text-right text-sm font-semibold text-gray-500 px-3 sm:px-5 py-3">תפקיד</th>
                    <th className="px-3 sm:px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isSelf = u.userId?.trim() === me?.userId?.trim();
                    const isDeleting = deletingId === u.userId;
                    return (
                      <tr key={u.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
                        <td className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-semibold text-gray-800 truncate max-w-[100px] sm:max-w-none">
                              {u.firstName} {u.lastName}
                              {isSelf && <span className="mr-1.5 text-sm text-primary font-medium">(אני)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-3.5 text-sm text-gray-500 tabular-nums hidden sm:table-cell">{u.userId?.trim()}</td>
                        <td className="px-3 sm:px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">{u.email || '—'}</td>
                        <td className="px-3 sm:px-5 py-3.5">
                          <RoleBadge role={u.systemAuthorization} />
                        </td>
                        <td className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setEditUser(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
                              title="עדכון תפקיד"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleDelete(u.userId, `${u.firstName} ${u.lastName}`)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="מחיקת משתמש"
                              >
                                {isDeleting ? (
                                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
          allRoles={roles.length > 0 ? roles : ALL_ROLES}
        />
      )}
      {editUser && (
        <EditRoleModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={load}
          allRoles={roles.length > 0 ? roles : ALL_ROLES}
        />
      )}
    </Layout>
  );
}
