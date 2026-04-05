import { useState, useEffect } from 'react';
import { getUsers } from '../../api/usersApi';
import { addTeamMember, removeTeamMember } from '../../api/projectsApi';

const RESEARCH_ASSISTANT_ROLE = 'עוזר מחקר';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

function getProjectRole(systemAuthorization) {
  if (systemAuthorization === 'מנהל מרכז') return 'מנהל מרכז מחקר';
  return 'חוקר';
}

const PI_BADGE = (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
    חוקר ראשי
  </span>
);

export default function TabTeam({ projectId, teamMembers, principalResearcherId, principalResearcherName, onChanged }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null); // userId to confirm removal

  useEffect(() => {
    getUsers()
      .then((r) => setAllUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = new Set(teamMembers.map((m) => m.userId));

  const filtered = allUsers.filter((u) => {
    if (selectedIds.has(u.userId)) return false;
    if (u.systemAuthorization === RESEARCH_ASSISTANT_ROLE) return false;
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
      await addTeamMember(projectId, {
        userId: user.userId,
        projectRole: getProjectRole(user.systemAuthorization),
      });
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

  const handleConfirmRemove = () => {
    if (confirmRemove) {
      handleRemove(confirmRemove);
    }
    setConfirmRemove(null);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add member panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">הוסף חבר צוות</h3>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={loading ? 'טוען...' : 'הוסף חבר צוות לפי שם או ת.ז'}
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
        <p className="text-xs text-gray-400">בחר משתמש מהרשימה — הוספה מתבצעת אוטומטית</p>
      </div>

      {/* Team list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 text-right">
          <span className="text-sm font-semibold text-gray-700">חברי הצוות ({teamMembers.length})</span>
        </div>
        {(() => {
          // Determine whether the PI already appears as a flagged team member.
          // We check both the backend flag AND a trimmed-ID fallback so the badge
          // shows reliably even if char(10) padding caused the flag to be missed.
          const piId = principalResearcherId?.trim() ?? '';
          const piInTeam = piId
            ? teamMembers.some(
                (m) => m.isPrincipalInvestigator || m.userId?.trim() === piId
              )
            : false;

          // If the PI is defined on the project but not present in the team table,
          // we show a read-only synthetic row so the label is always visible.
          const showVirtualPI = piId && principalResearcherName && !piInTeam;

          const isEmpty = teamMembers.length === 0 && !showVirtualPI;

          if (isEmpty) {
            return <p className="text-sm text-gray-400 text-center py-12">אין חברי צוות עדיין</p>;
          }

          return (
            <div className="divide-y divide-gray-100">
              {/* Virtual PI row — only when PI is not already a team member */}
              {showVirtualPI && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50/40">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {principalResearcherName?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{principalResearcherName}</p>
                    <p className="text-xs text-gray-400">{piId}</p>
                  </div>
                  {PI_BADGE}
                </div>
              )}

              {/* Regular team members */}
              {teamMembers.map((m) => {
                const isPI = m.isPrincipalInvestigator || (piId && m.userId?.trim() === piId);
                return (
                  <div key={m.userId} className={`flex items-center gap-3 px-5 py-3.5 ${isPI ? 'bg-amber-50/40' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-400">{m.userId} · {m.systemAuthorization}</p>
                    </div>
                    {isPI && PI_BADGE}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.projectRole}</span>
                    <button type="button" onClick={() => setConfirmRemove(m.userId)} disabled={saving}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Confirm removal dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">הסרת חבר צוות</h3>
            <p className="text-sm text-gray-600 mb-6">
              האם אתה בטוח שברצונך להסיר את חבר הצוות מהמחקר?
            </p>
            <div className="flex gap-3 justify-start">
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                הסר
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
