import { useEffect, useState } from 'react';
import { getUsers } from '../../api/usersApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errorCls = 'border-red-400 focus:ring-red-400';

const EMPTY_NEW_FORM = {
  assistantUserId: '',
  firstName: '',
  lastName: '',
  email: '',
  salaryPerHour: '',
};

export default function StepAssistants({ data, onChange }) {
  const [allUsers, setAllUsers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [query, setQuery]               = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [tab, setTab]                   = useState('existing');

  // Staging for existing user
  const [stagedUser, setStagedUser]         = useState(null);
  const [stagedSalary, setStagedSalary]     = useState('');
  const [stagedSalaryError, setStagedSalaryError] = useState('');

  // Form for new user
  const [newForm, setNewForm]         = useState(EMPTY_NEW_FORM);
  const [newFormErrors, setNewFormErrors] = useState({});

  useEffect(() => {
    getUsers()
      .then((res) => setAllUsers(res.data))
      .catch(() => setLoadError('שגיאה בטעינת רשימת המשתמשים'))
      .finally(() => setLoading(false));
  }, []);

  const selectedExistingIds = new Set(
    data.filter((a) => !a.isNewUser).map((a) => a.assistantUserId)
  );
  const selectedNewIds = new Set(
    data.filter((a) => a.isNewUser).map((a) => a.assistantUserId)
  );

  // Only show עוזר מחקר users that haven't been added yet
  const filtered = allUsers.filter((u) => {
    if (u.systemAuthorization !== 'עוזר מחקר') return false;
    if (selectedExistingIds.has(u.userId)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.userId.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  });

  const displayed = query ? filtered : filtered.slice(0, 10);

  // --- Existing user flow ---
  const stageExisting = (user) => {
    setStagedUser(user);
    setStagedSalary(user.salaryPerHour != null ? String(user.salaryPerHour) : '');
    setStagedSalaryError('');
    setQuery(`${user.firstName} ${user.lastName}`);
    setShowDropdown(false);
  };

  const commitStaged = () => {
    if (!stagedUser) return;
    if (!stagedSalary || parseFloat(stagedSalary) <= 0) {
      setStagedSalaryError('שכר לשעה הוא שדה חובה');
      return;
    }
    onChange([...data, {
      isNewUser: false,
      assistantUserId: stagedUser.userId,
      firstName: stagedUser.firstName,
      lastName: stagedUser.lastName,
      role: 'עוזר מחקר',
      salaryPerHour: stagedSalary,
    }]);
    setStagedUser(null);
    setStagedSalary('');
    setStagedSalaryError('');
    setQuery('');
  };

  // --- New user flow ---
  const setNf = (field) => (e) =>
    setNewForm((f) => ({ ...f, [field]: e.target.value }));

  const commitNew = () => {
    const errs = {};
    if (!newForm.assistantUserId.trim()) errs.assistantUserId = 'שדה חובה';
    if (!newForm.firstName.trim())       errs.firstName = 'שדה חובה';
    if (!newForm.lastName.trim())        errs.lastName = 'שדה חובה';
    if (!newForm.email.trim())           errs.email = 'שדה חובה';
    if (!newForm.salaryPerHour || parseFloat(newForm.salaryPerHour) <= 0)
      errs.salaryPerHour = 'שדה חובה';
    if (selectedNewIds.has(newForm.assistantUserId.trim()))
      errs.assistantUserId = 'ת.ז. זו כבר קיימת ברשימה';

    setNewFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onChange([...data, {
      isNewUser: true,
      assistantUserId: newForm.assistantUserId.trim(),
      firstName: newForm.firstName.trim(),
      lastName: newForm.lastName.trim(),
      email: newForm.email.trim(),
      role: 'עוזר מחקר',
      salaryPerHour: newForm.salaryPerHour,
    }]);
    setNewForm(EMPTY_NEW_FORM);
    setNewFormErrors({});
  };

  const removeAssistant = (item) => onChange(data.filter((a) => a !== item));

  const updateSalary = (item, value) =>
    onChange(data.map((a) => (a === item ? { ...a, salaryPerHour: value } : a)));

  return (
    <div className="space-y-4">
      {/* Tabs */}
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

      {/* --- Tab: Existing --- */}
      {tab === 'existing' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          {loadError && <p className="text-xs text-red-500">{loadError}</p>}

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setStagedUser(null); }}
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
                      <li key={u.userId} onMouseDown={() => stageExisting(u)}
                        className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                          <span className="text-xs text-gray-400">
                            {u.salaryPerHour != null ? `₪${u.salaryPerHour}/שעה` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">ת"ז - {u.userId}</p>
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
                    {allUsers.filter((u) => u.systemAuthorization === 'עוזר מחקר').length === 0
                      ? 'אין עוזרי מחקר במערכת'
                      : 'לא נמצאו תוצאות'}
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Staging area */}
          {stagedUser && (
            <div className="bg-white border border-primary/30 rounded-xl p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                  {(stagedUser.firstName?.[0] ?? '') + (stagedUser.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{stagedUser.firstName} {stagedUser.lastName}</p>
                  <p className="text-xs text-gray-400">ת"ז - {stagedUser.userId}</p>
                </div>
                <button type="button"
                  onClick={() => { setStagedUser(null); setQuery(''); setStagedSalaryError(''); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="number" min={0}
                    value={stagedSalary}
                    onChange={(e) => { setStagedSalary(e.target.value); setStagedSalaryError(''); }}
                    placeholder="שכר לשעה (₪) *"
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${stagedSalaryError ? errorCls : 'border-gray-200'}`}
                  />
                  {stagedSalaryError && <p className="text-xs text-red-500 mt-1">{stagedSalaryError}</p>}
                </div>
                <button type="button" onClick={commitStaged}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  הוסף
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Tab: New user --- */}
      {tab === 'new' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs text-gray-500">
            עוזר חדש ייצור חשבון משתמש עם סיסמה זמנית: <code className="bg-gray-100 px-1 rounded">Temp1234!</code>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input type="text" placeholder="ת.ז. (10 ספרות) *" value={newForm.assistantUserId}
                onChange={setNf('assistantUserId')} maxLength={10}
                className={`${inputCls} ${newFormErrors.assistantUserId ? errorCls : ''}`} />
              {newFormErrors.assistantUserId && <p className="text-xs text-red-500 mt-0.5">{newFormErrors.assistantUserId}</p>}
            </div>
            <div>
              <input type="text" placeholder="שם פרטי *" value={newForm.firstName}
                onChange={setNf('firstName')}
                className={`${inputCls} ${newFormErrors.firstName ? errorCls : ''}`} />
              {newFormErrors.firstName && <p className="text-xs text-red-500 mt-0.5">{newFormErrors.firstName}</p>}
            </div>
            <div>
              <input type="text" placeholder="שם משפחה *" value={newForm.lastName}
                onChange={setNf('lastName')}
                className={`${inputCls} ${newFormErrors.lastName ? errorCls : ''}`} />
              {newFormErrors.lastName && <p className="text-xs text-red-500 mt-0.5">{newFormErrors.lastName}</p>}
            </div>
            <div>
              <input type="email" placeholder="אימייל *" value={newForm.email}
                onChange={setNf('email')}
                className={`${inputCls} ${newFormErrors.email ? errorCls : ''}`} />
              {newFormErrors.email && <p className="text-xs text-red-500 mt-0.5">{newFormErrors.email}</p>}
            </div>
            <div className="col-span-2">
              <input type="number" placeholder="שכר לשעה (₪) *" value={newForm.salaryPerHour}
                onChange={setNf('salaryPerHour')}
                className={`${inputCls} ${newFormErrors.salaryPerHour ? errorCls : ''}`} />
              {newFormErrors.salaryPerHour && <p className="text-xs text-red-500 mt-0.5">{newFormErrors.salaryPerHour}</p>}
            </div>
          </div>
          <button type="button" onClick={commitNew}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הוסף עוזר מחקר חדש
          </button>
        </div>
      )}

      {/* --- Unified selected assistants list --- */}
      {data.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">עוזרי מחקר ({data.length})</p>
          {data.map((a, idx) => (
            <div key={a.assistantUserId ?? idx}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                  {a.isNewUser && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">חדש</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">ת"ז - {a.assistantUserId}</p>
              </div>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium flex-shrink-0">
                עוזר מחקר
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <input
                  type="number" min={0}
                  value={a.salaryPerHour}
                  onChange={(e) => updateSalary(a, e.target.value)}
                  placeholder="₪/שעה"
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button type="button" onClick={() => removeAssistant(a)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && !loading && (
        <p className="text-sm text-gray-400 text-center py-4">טרם נוספו עוזרי מחקר</p>
      )}
    </div>
  );
}
