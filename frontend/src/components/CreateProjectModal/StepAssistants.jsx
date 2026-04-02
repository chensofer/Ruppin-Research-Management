import { useEffect, useState } from 'react';
import { getUsers } from '../../api/usersApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

function newManualRow() {
  return {
    _key: crypto.randomUUID(),
    isNewUser: true,
    assistantUserId: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'עוזר מחקר',
    salaryPerHour: '',
  };
}

export default function StepAssistants({ data, onChange }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [tab, setTab] = useState('existing');

  useEffect(() => {
    // Load all users — any user can be assigned as an assistant
    getUsers('Research Assistant')
      .then((res) => setAllUsers(res.data))
      .catch(() => setLoadError('שגיאה בטעינת רשימת המשתמשים'))
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = new Set(data.filter((a) => !a.isNewUser).map((a) => a.assistantUserId));

  const filtered = allUsers.filter((u) => {
    if (selectedIds.has(u.userId)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.userId.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  });

  const displayed = query ? filtered : filtered.slice(0, 10);

  const addExisting = (user) => {
    onChange([...data, {
      isNewUser: false,
      assistantUserId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'עוזר מחקר',
      salaryPerHour: '',
    }]);
    setQuery('');
    setShowDropdown(false);
  };

  const addManual = () => onChange([...data, newManualRow()]);

  const removeByItem = (item) => onChange(data.filter((a) => a !== item));

  const updateManual = (item, field, value) =>
    onChange(data.map((a) => (a === item ? { ...a, [field]: value } : a)));

  const setWage = (item, value) =>
    onChange(data.map((a) => (a === item ? { ...a, salaryPerHour: value } : a)));

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex border-b border-gray-200">
        {[['existing', 'בחר עוזר קיים'], ['new', 'הוסף עוזר חדש']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'existing' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          {loadError && <p className="text-xs text-red-500 mb-2">{loadError}</p>}

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={loading ? 'טוען משתמשים...' : 'חפש עוזר מחקר לפי שם או ת.ז...'}
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
                        onMouseDown={() => addExisting(u)}
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
      )}

      {tab === 'new' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            עוזר חדש ייצור חשבון משתמש עם סיסמה זמנית: <code className="bg-gray-100 px-1 rounded">Temp1234!</code>
          </p>
          <button
            type="button"
            onClick={addManual}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הוסף עוזר חדש
          </button>

          {data.filter((a) => a.isNewUser).map((item) => (
            <div key={item._key} className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-gray-200 mt-2">
              <input type="text" placeholder="ת.ז. (10 ספרות)" value={item.assistantUserId}
                onChange={(e) => updateManual(item, 'assistantUserId', e.target.value)}
                className={inputCls} maxLength={10} />
              <input type="text" placeholder="שם פרטי" value={item.firstName}
                onChange={(e) => updateManual(item, 'firstName', e.target.value)}
                className={inputCls} />
              <input type="text" placeholder="שם משפחה" value={item.lastName}
                onChange={(e) => updateManual(item, 'lastName', e.target.value)}
                className={inputCls} />
              <input type="email" placeholder="אימייל" value={item.email}
                onChange={(e) => updateManual(item, 'email', e.target.value)}
                className={inputCls} />
              <input type="number" placeholder="שכר לשעה (₪)" value={item.salaryPerHour}
                onChange={(e) => updateManual(item, 'salaryPerHour', e.target.value)}
                className={inputCls} />
              <div className="flex items-center justify-end">
                <button type="button" onClick={() => removeByItem(item)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors">
                  הסר
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected existing assistants */}
      {data.filter((a) => !a.isNewUser).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">עוזרים שנבחרו</p>
          {data.filter((a) => !a.isNewUser).map((a) => (
            <div key={a.assistantUserId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                <p className="text-xs text-gray-400">{a.assistantUserId}</p>
              </div>
              <input
                type="number"
                min={0}
                value={a.salaryPerHour}
                onChange={(e) => setWage(a, e.target.value)}
                placeholder="₪/שעה"
                className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => removeByItem(a)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && tab === 'existing' && !loading && (
        <p className="text-sm text-gray-400 text-center py-4">לחץ על שדה החיפוש לבחירת עוזר מחקר</p>
      )}
    </div>
  );
}
