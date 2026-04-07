import { useEffect, useRef, useState } from 'react';
import CategoryPicker from './CategoryPicker';
import { getProviders } from '../../api/providersApi';

const inputCls =
  'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';
const errorCls = 'border-red-400 focus:ring-red-400';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

const EMPTY_NEW_PROVIDER = { providerName: '', phone: '', email: '', notes: '' };

const EMPTY_DRAFT = {
  categoryName: '',
  requestDescription: '',
  requestedAmount: '',
  requestDate: '',
  providerId: null,
  providerName: '',
  isNewProvider: false,
  newProvider: { ...EMPTY_NEW_PROVIDER },
  files: [],
};

function AddExpenseForm({ onAdd }) {
  const [draft, setDraft]               = useState({ ...EMPTY_DRAFT });
  const [providerQuery, setProviderQuery] = useState('');
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [providers, setProviders]       = useState([]);
  const [providerMode, setProviderMode] = useState('none'); // 'none' | 'existing' | 'new'
  const [errors, setErrors]             = useState({});
  const fileRef                         = useRef(null);

  useEffect(() => {
    getProviders().then((res) => setProviders(res.data)).catch(() => {});
  }, []);

  const filteredProviders = providers.filter((p) => {
    if (!providerQuery) return true;
    return p.providerName?.toLowerCase().includes(providerQuery.toLowerCase());
  });

  const selectProvider = (p) => {
    setDraft((d) => ({ ...d, providerId: p.providerId, providerName: p.providerName, isNewProvider: false }));
    setProviderQuery(p.providerName);
    setShowProviderDrop(false);
  };

  const clearProvider = () => {
    setDraft((d) => ({ ...d, providerId: null, providerName: '', isNewProvider: false, newProvider: { ...EMPTY_NEW_PROVIDER } }));
    setProviderQuery('');
    setProviderMode('none');
  };

  const setNp = (field) => (e) =>
    setDraft((d) => ({ ...d, newProvider: { ...d.newProvider, [field]: e.target.value } }));

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files).map((f) => ({ file: f, name: f.name }));
    setDraft((d) => ({ ...d, files: [...d.files, ...picked] }));
    e.target.value = '';
  };

  const removeFile = (idx) =>
    setDraft((d) => ({ ...d, files: d.files.filter((_, i) => i !== idx) }));

  const submit = () => {
    const errs = {};
    if (!draft.categoryName.trim()) errs.categoryName = 'יש לבחור קטגוריה';
    if (!draft.requestedAmount || parseFloat(draft.requestedAmount) <= 0)
      errs.requestedAmount = 'יש להזין סכום';
    if (providerMode === 'new' && !draft.newProvider.providerName.trim())
      errs.providerName = 'שם הספק הוא שדה חובה';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const toAdd = {
      ...draft,
      isNewProvider: providerMode === 'new',
      providerId: providerMode === 'existing' ? draft.providerId : null,
      providerName: providerMode === 'existing' ? draft.providerName : (providerMode === 'new' ? draft.newProvider.providerName : ''),
    };
    onAdd(toAdd);
    setDraft({ ...EMPTY_DRAFT });
    setProviderQuery('');
    setProviderMode('none');
    setErrors({});
  };

  return (
    <div className="space-y-3">
      {/* Category */}
      <div>
        <CategoryPicker
          value={draft.categoryName}
          onChange={(v) => setDraft((d) => ({ ...d, categoryName: v }))}
          placeholder="בחר קטגוריית הוצאה *"
        />
        {errors.categoryName && <p className="text-xs text-red-500 mt-1">{errors.categoryName}</p>}
      </div>

      {/* Description */}
      <input
        type="text"
        value={draft.requestDescription}
        onChange={(e) => setDraft((d) => ({ ...d, requestDescription: e.target.value }))}
        placeholder="תיאור ההוצאה (אופציונלי)"
        className={inputCls}
      />

      {/* Amount + Date */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number" min={0}
            value={draft.requestedAmount}
            onChange={(e) => setDraft((d) => ({ ...d, requestedAmount: e.target.value }))}
            placeholder="סכום (₪) *"
            className={`${inputCls} ${errors.requestedAmount ? errorCls : ''}`}
          />
          {errors.requestedAmount && <p className="text-xs text-red-500 mt-1">{errors.requestedAmount}</p>}
        </div>
        <input
          type="date"
          value={draft.requestDate}
          onChange={(e) => setDraft((d) => ({ ...d, requestDate: e.target.value }))}
          className={`${inputCls} flex-1`}
        />
      </div>

      {/* Supplier section */}
      <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">ספק</span>
          {providerMode !== 'none' && (
            <button type="button" onClick={clearProvider}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">ביטול</button>
          )}
        </div>

        {providerMode === 'none' && (
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setProviderMode('existing')}
              className="flex-1 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary-light transition-colors">
              בחר ספק קיים
            </button>
            <button type="button"
              onClick={() => { setProviderMode('new'); }}
              className="flex-1 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary-light transition-colors">
              + הוסף ספק חדש
            </button>
          </div>
        )}

        {providerMode === 'existing' && (
          <div className="relative">
            {draft.providerId ? (
              <div className="flex items-center justify-between bg-primary-light border border-primary/20 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-primary">{draft.providerName}</span>
                <button type="button" onClick={clearProvider}
                  className="text-primary/50 hover:text-primary transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={providerQuery}
                  onChange={(e) => { setProviderQuery(e.target.value); setShowProviderDrop(true); }}
                  onFocus={() => setShowProviderDrop(true)}
                  onBlur={() => setTimeout(() => setShowProviderDrop(false), 150)}
                  placeholder="חפש ספק לפי שם..."
                  className={inputCls}
                />
                {showProviderDrop && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredProviders.length > 0 ? filteredProviders.map((p) => (
                      <li key={p.providerId} onMouseDown={() => selectProvider(p)}
                        className="px-3 py-2 cursor-pointer hover:bg-primary-light text-sm text-gray-800">
                        {p.providerName}
                        {p.phone && <span className="text-xs text-gray-400 mr-2">{p.phone}</span>}
                      </li>
                    )) : (
                      <li className="px-3 py-2 text-sm text-gray-400 text-center">לא נמצאו ספקים</li>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {providerMode === 'new' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input type="text" placeholder="שם הספק *" value={draft.newProvider.providerName}
                onChange={setNp('providerName')}
                className={`${inputCls} ${errors.providerName ? errorCls : ''}`} />
              {errors.providerName && <p className="text-xs text-red-500 mt-0.5">{errors.providerName}</p>}
            </div>
            <input type="text" placeholder="טלפון" value={draft.newProvider.phone}
              onChange={setNp('phone')} className={inputCls} />
            <input type="email" placeholder="אימייל" value={draft.newProvider.email}
              onChange={setNp('email')} className={inputCls} />
            <input type="text" placeholder="תיאור" value={draft.newProvider.notes}
              onChange={setNp('notes')} className={`${inputCls} col-span-2`} />
          </div>
        )}
      </div>

      {/* File attachments */}
      <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">מסמכים מצורפים</span>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-xs text-primary hover:text-primary-dark transition-colors font-medium">
            + הוסף קובץ
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
        </div>
        {draft.files.length > 0 ? (
          <ul className="space-y-1">
            {draft.files.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors mr-2">✕</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">לא נבחרו קבצים</p>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!draft.categoryName.trim()}
        className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
      >
        + הוסף הוצאה
      </button>
    </div>
  );
}

export default function StepExpenses({ data, onChange }) {
  const addRow = (draft) => onChange([...data, { ...draft, _key: crypto.randomUUID() }]);
  const removeRow = (key) => onChange(data.filter((r) => r._key !== key));

  const total = data.reduce((s, r) => s + (parseFloat(r.requestedAmount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">הוסף הוצאה שכבר שולמה</h3>
        </div>
        <AddExpenseForm onAdd={addRow} />
      </div>

      {/* Expense list */}
      {data.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">הוצאות שנוספו ({data.length})</p>
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row._key}
                className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{row.categoryName}</p>
                    {row.requestDescription && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{row.requestDescription}</p>
                    )}
                    {row.providerName && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ספק: {row.providerName}
                        {row.isNewProvider && <span className="text-amber-600 mr-1">(חדש)</span>}
                      </p>
                    )}
                    {row.requestDate && (
                      <p className="text-xs text-gray-400">{fmtDate(row.requestDate)}</p>
                    )}
                    {row.files?.length > 0 && (
                      <p className="text-xs text-blue-500 mt-0.5">{row.files.length} קובץ מצורף</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mr-3">
                    <span className="text-sm font-bold text-red-600">
                      {row.requestedAmount ? fmt(parseFloat(row.requestedAmount)) : '—'}
                    </span>
                    <button type="button" onClick={() => removeRow(row._key)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">ניתן לדלג על שלב זה אם אין הוצאות</p>
      )}

      {total > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex justify-between text-sm">
          <span className="font-bold text-red-600">{fmt(total)}</span>
          <span className="text-gray-500">:סה״כ הוצאות</span>
        </div>
      )}
    </div>
  );
}
