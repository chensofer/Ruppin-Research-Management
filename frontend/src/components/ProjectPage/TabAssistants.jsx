import { useState, useEffect } from 'react';
import { getUsers } from '../../api/usersApi';
import { addAssistant, removeAssistant } from '../../api/projectsApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

export default function TabAssistants({ projectId, assistants, onChanged }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [stagedUser, setStagedUser] = useState(null);
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

      {/* Add panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">הוסף עוזר מחקר</h3>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setStagedUser(null); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={loading ? 'טוען...' : 'חפש עוזר לפי שם או ת.ז...'}
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
                <li className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</li>
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
                <button type="button" onClick={() => handleRemove(a.assistantUserId)} disabled={saving}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
