import { useEffect, useState } from 'react';
import { getUsers } from '../../api/usersApi';

const ROLES = ['חוקר', 'מנהל מרכז מחקר'];
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

export default function StepTeam({ data, onChange }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Load all users — role filtering is done client-side so we always have data
    getUsers()
      .then((res) => setAllUsers(res.data))
      .catch(() => setLoadError('שגיאה בטעינת רשימת המשתמשים'))
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = new Set(data.map((m) => m.userId));

  const filtered = allUsers.filter((u) => {
    if (selectedIds.has(u.userId)) return false;
    if (!query) return true; // show all when no query
    const q = query.toLowerCase();
    return (
      u.userId.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  });

  // Limit to 10 results when no query to avoid a massive list
  const displayed = query ? filtered : filtered.slice(0, 10);

  const addMember = (user) => {
    onChange([...data, {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      systemAuthorization: user.systemAuthorization,
      projectRole: ROLES[0],
    }]);
    setQuery('');
    setShowDropdown(false);
  };

  const removeMember = (userId) => onChange(data.filter((m) => m.userId !== userId));

  const setRole = (userId, role) =>
    onChange(data.map((m) => (m.userId === userId ? { ...m, projectRole: role } : m)));

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">הוסף חוקרים לצוות</h3>
        </div>

        {loadError && (
          <p className="text-xs text-red-500 mb-2">{loadError}</p>
        )}

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={loading ? 'טוען משתמשים...' : 'חפש לפי שם או ת.ז...'}
            disabled={loading}
            className={inputCls}
          />

          {showDropdown && !loading && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {displayed.length > 0 ? (
                <>
                  {displayed.map((u) => (
                    <li
                      key={u.userId}
                      onMouseDown={() => addMember(u)}
                      className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                      <span className="text-xs text-gray-400">{u.userId} · {u.systemAuthorization || 'ללא תפקיד'}</span>
                    </li>
                  ))}
                  {!query && filtered.length > 10 && (
                    <li className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                      + {filtered.length - 10} נוספים — הקלד לסינון
                    </li>
                  )}
                </>
              ) : (
                <li className="px-3 py-3 text-sm text-gray-400 text-center">
                  {allUsers.length === 0 ? 'אין משתמשים במערכת' : 'לא נמצאו תוצאות'}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-gray-400">{m.userId} · {m.systemAuthorization}</p>
              </div>
              <select
                value={m.projectRole}
                onChange={(e) => setRole(m.userId, e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeMember(m.userId)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && !loading && (
        <p className="text-sm text-gray-400 text-center py-4">לחץ על שדה החיפוש לבחירת חברי צוות</p>
      )}
    </div>
  );
}
