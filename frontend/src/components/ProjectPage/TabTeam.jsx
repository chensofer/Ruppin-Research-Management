import { useState } from 'react';
import { getUsers } from '../../api/usersApi';
import { addTeamMember, removeTeamMember } from '../../api/projectsApi';
import { useEffect } from 'react';

const ROLES = ['חוקר', 'מנהל מרכז מחקר'];
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

export default function TabTeam({ projectId, teamMembers, onChanged }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getUsers()
      .then((r) => setAllUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = new Set(teamMembers.map((m) => m.userId));

  const filtered = allUsers.filter((u) => {
    if (selectedIds.has(u.userId)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.userId.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
  });

  const displayed = query ? filtered : filtered.slice(0, 10);

  const handleAdd = async (user) => {
    setQuery('');
    setShowDropdown(false);
    setSaving(true);
    setError('');
    try {
      await addTeamMember(projectId, { userId: user.userId, projectRole: selectedRole });
      onChanged();
    } catch {
      setError('שגיאה בהוספת חבר צוות');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    setSaving(true);
    setError('');
    try {
      await removeTeamMember(projectId, userId);
      onChanged();
    } catch {
      setError('שגיאה בהסרת חבר צוות');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add member panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">הוסף חבר צוות</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={loading ? 'טוען...' : 'חפש לפי שם או ת.ז...'}
              disabled={loading || saving}
              className={inputCls}
            />
            {showDropdown && !loading && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {displayed.length > 0 ? displayed.map((u) => (
                  <li key={u.userId} onMouseDown={() => handleAdd(u)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex justify-between items-center">
                    <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-gray-400">{u.userId} · {u.systemAuthorization}</span>
                  </li>
                )) : (
                  <li className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</li>
                )}
              </ul>
            )}
          </div>

          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={inputCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400">בחר משתמש מהרשימה — הוספה מתבצעת אוטומטית</p>
      </div>

      {/* Team list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 text-right">
          <span className="text-sm font-semibold text-gray-700">חברי הצוות ({teamMembers.length})</span>
        </div>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">אין חברי צוות עדיין</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {teamMembers.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-gray-400">{m.userId} · {m.systemAuthorization}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.projectRole}</span>
                <button type="button" onClick={() => handleRemove(m.userId)} disabled={saving}
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
