import { useEffect, useRef, useState } from 'react';
import HebrewDatePicker from '../HebrewDatePicker';
import { getUsers } from '../../api/usersApi';
import { getCenters } from '../../api/centersApi';
import UserAvatar from '../UserAvatar';


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

  const [allUsers, setAllUsers]         = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [piQuery, setPiQuery]           = useState('');
  const [showPiDrop, setShowPiDrop]     = useState(false);
  const [centers, setCenters]           = useState([]);
  const piInputRef = useRef(null);
  const [piDropRect, setPiDropRect]     = useState(null);

  useEffect(() => {
    getUsers()
      .then((res) => setAllUsers(res.data))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
    getCenters()
      .then((res) => setCenters(res.data))
      .catch(() => {});
  }, []);

  // Exclude research assistants from PI picker
  const piFiltered = allUsers
    .filter((u) => {
      if (u.systemAuthorization === 'עוזר מחקר') return false;
      if (!piQuery) return true;
      const q = piQuery.toLowerCase();
      return (
        u.userId.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      );
    });

  const selectPI = (user) => {
    onChange({
      ...data,
      principalResearcherId: user.userId,
      principalResearcherName: `${user.firstName} ${user.lastName}`,
      principalResearcherRole: user.systemAuthorization,
    });
    setPiQuery('');
    setShowPiDrop(false);
  };

  const clearPI = () =>
    onChange({ ...data, principalResearcherId: '', principalResearcherName: '', principalResearcherRole: '' });

  return (
    <div className="space-y-4">
      {/* Names */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="שם מחקר" required error={errors.projectNameHe}>
          <input
            type="text"
            value={data.projectNameHe}
            onChange={set('projectNameHe')}
            placeholder="הזן שם מחקר בעברית"
            className={`${inputCls} ${errors.projectNameHe ? errorCls : ''}`}
          />
        </Field>
        <Field label="שם מחקר באנגלית">
          <input
            type="text"
            value={data.projectNameEn}
            onChange={set('projectNameEn')}
            placeholder="Research name in English"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Principal researcher */}
      <Field label="חוקר ראשי" required error={errors.principalResearcherId}>
        {data.principalResearcherId ? (
          <div className={`flex items-center gap-3 bg-primary-light border rounded-lg px-3 py-2.5 ${errors.principalResearcherId ? 'border-red-400' : 'border-primary/20'}`}>
            <UserAvatar userId={data.principalResearcherId} firstName={data.principalResearcherName} size="md" className="bg-primary text-white" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{data.principalResearcherName}</p>
              <p className="text-xs text-primary/60">ת"ז - {data.principalResearcherId}</p>
            </div>
            {data.principalResearcherRole && (
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                {data.principalResearcherRole}
              </span>
            )}
            <button type="button" onClick={clearPI}
              className="text-primary/40 hover:text-primary transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={piInputRef}
              type="text"
              value={piQuery}
              onChange={(e) => { setPiQuery(e.target.value); setShowPiDrop(true); }}
              onFocus={() => { if (piInputRef.current) setPiDropRect(piInputRef.current.getBoundingClientRect()); setShowPiDrop(true); }}
              onBlur={() => setTimeout(() => setShowPiDrop(false), 150)}
              placeholder={usersLoading ? 'טוען חוקרים...' : 'חפש חוקר לפי שם או ת.ז...'}
              disabled={usersLoading}
              className={`${inputCls} ${errors.principalResearcherId ? errorCls : ''}`}
            />
            {showPiDrop && !usersLoading && piDropRect && (
              <ul
                style={{
                  position: 'fixed',
                  top: piDropRect.bottom + 4,
                  left: piDropRect.left,
                  width: piDropRect.width,
                  zIndex: 9999,
                }}
                className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {piFiltered.length > 0 ? piFiltered.map((u) => (
                  <li key={u.userId} onMouseDown={() => selectPI(u)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-primary-light text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">ת"ז - {u.userId}</p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {u.systemAuthorization}
                    </span>
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

      {/* Research center */}
      <Field label="מרכז מחקר" error={errors.centerId}>
        <select
          value={data.centerId}
          onChange={set('centerId')}
          className={`${inputCls} ${errors.centerId ? errorCls : ''}`}
        >
          <option value="">— ללא שיוך למרכז מחקר —</option>
          {centers.map((c) => (
            <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
          ))}
        </select>
      </Field>

      {/* Budget + Funding Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="הקצאת תקציב (₪)" required error={errors.totalBudget}>
          <input
            type="number"
            min={0}
            value={data.totalBudget}
            onChange={set('totalBudget')}
            placeholder="0"
            className={`${inputCls} ${errors.totalBudget ? errorCls : ''}`}
          />
        </Field>
        <Field label="מקור מימון" error={errors.fundingSource}>
          <input
            type="text"
            value={data.fundingSource}
            onChange={set('fundingSource')}
            placeholder="לדוגמה: קרן מדע, ISF..."
            className={inputCls}
          />
        </Field>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="תאריך התחלה" required error={errors.startDate}>
          <HebrewDatePicker
            value={data.startDate}
            onChange={(iso) => onChange({ ...data, startDate: iso })}
            placeholder="בחר תאריך התחלה"
            className={`${inputCls} ${errors.startDate ? errorCls : ''}`}
          />
        </Field>
        <Field label="תאריך סיום משוער" required error={errors.endDate}>
          <HebrewDatePicker
            value={data.endDate}
            onChange={(iso) => onChange({ ...data, endDate: iso })}
            placeholder="בחר תאריך סיום"
            minDate={data.startDate}
            className={`${inputCls} ${errors.endDate ? errorCls : ''}`}
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="תיאור המחקר" error={errors.projectDescription}>
        <textarea
          rows={3}
          value={data.projectDescription}
          onChange={set('projectDescription')}
          placeholder="תאר בקצרה את נושא המחקר..."
          className={`${inputCls} resize-none`}
        />
      </Field>
    </div>
  );
}
