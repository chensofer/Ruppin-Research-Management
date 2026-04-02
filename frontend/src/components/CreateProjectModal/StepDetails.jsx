import { useEffect, useState } from 'react';
import { getUsers } from '../../api/usersApi';
import { getCenters } from '../../api/centersApi';

function Field({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errorCls = 'border-red-400 focus:ring-red-400';

export default function StepDetails({ data, onChange, errors }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value });

  // Principal researcher picker
  const [allUsers, setAllUsers]       = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [piQuery, setPiQuery]         = useState('');
  const [showPiDrop, setShowPiDrop]   = useState(false);

  // Center picker
  const [centers, setCenters]         = useState([]);

  useEffect(() => {
    // Load researchers — role names as stored in research_roles table
    getUsers('Researcher,Research manager')
      .then((res) => setAllUsers(res.data))
      .catch(() => {})
      .finally(() => setUsersLoading(false));

    getCenters()
      .then((res) => setCenters(res.data))
      .catch(() => {});
  }, []);

  // Filter users for PI dropdown
  const piFiltered = allUsers.filter((u) => {
    if (!piQuery) return true;
    const q = piQuery.toLowerCase();
    return (
      u.userId.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const selectPI = (user) => {
    onChange({ ...data, principalResearcherId: user.userId, principalResearcherName: `${user.firstName} ${user.lastName}` });
    setPiQuery('');
    setShowPiDrop(false);
  };

  const clearPI = () => onChange({ ...data, principalResearcherId: '', principalResearcherName: '' });

  return (
    <div className="space-y-4">
      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="שם המחקר (עברית)" required error={errors.projectNameHe}>
          <input
            type="text"
            value={data.projectNameHe}
            onChange={set('projectNameHe')}
            placeholder="הזן שם מחקר בעברית"
            className={`${inputCls} ${errors.projectNameHe ? errorCls : ''}`}
          />
        </Field>

        <Field label="שם המחקר (אנגלית)">
          <input
            type="text"
            value={data.projectNameEn}
            onChange={set('projectNameEn')}
            placeholder="Research name in English"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="תיאור המחקר">
        <textarea
          rows={3}
          value={data.projectDescription}
          onChange={set('projectDescription')}
          placeholder="תאר בקצרה את נושא המחקר..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* Budget + dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="תקציב כולל (₪)" required error={errors.totalBudget}>
          <input
            type="number"
            min={0}
            value={data.totalBudget}
            onChange={set('totalBudget')}
            placeholder="0"
            className={`${inputCls} ${errors.totalBudget ? errorCls : ''}`}
          />
        </Field>

        <Field label="מקור מימון">
          <input
            type="text"
            value={data.fundingSource}
            onChange={set('fundingSource')}
            placeholder="לדוגמה: קרן מדע, ISF..."
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="תאריך התחלה">
          <input type="date" value={data.startDate} onChange={set('startDate')} className={inputCls} />
        </Field>
        <Field label="תאריך סיום">
          <input type="date" value={data.endDate} onChange={set('endDate')} className={inputCls} />
        </Field>
      </div>

      {/* Principal researcher — searchable single-select */}
      <Field label="חוקר ראשי">
        {data.principalResearcherId ? (
          // Selected state
          <div className="flex items-center gap-3 bg-primary-light border border-primary/20 rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {data.principalResearcherName?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{data.principalResearcherName}</p>
              <p className="text-xs text-primary/60">{data.principalResearcherId}</p>
            </div>
            <button type="button" onClick={clearPI}
              className="text-primary/50 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          // Search state
          <div className="relative">
            <input
              type="text"
              value={piQuery}
              onChange={(e) => { setPiQuery(e.target.value); setShowPiDrop(true); }}
              onFocus={() => setShowPiDrop(true)}
              onBlur={() => setTimeout(() => setShowPiDrop(false), 150)}
              placeholder={usersLoading ? 'טוען חוקרים...' : 'חפש חוקר לפי שם או ת.ז...'}
              disabled={usersLoading}
              className={inputCls}
            />
            {showPiDrop && !usersLoading && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {piFiltered.length > 0 ? piFiltered.map((u) => (
                  <li key={u.userId} onMouseDown={() => selectPI(u)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex justify-between items-center">
                    <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-gray-400">{u.userId} · {u.systemAuthorization}</span>
                  </li>
                )) : (
                  <li className="px-3 py-3 text-sm text-gray-400 text-center">
                    {allUsers.length === 0 ? 'אין חוקרים במערכת' : 'לא נמצאו תוצאות'}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </Field>

      {/* Research center — optional */}
      <Field label="מרכז מחקר (אופציונלי)">
        <select
          value={data.centerId}
          onChange={set('centerId')}
          className={inputCls}
        >
          <option value="">— ללא שיוך למרכז —</option>
          {centers.map((c) => (
            <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
