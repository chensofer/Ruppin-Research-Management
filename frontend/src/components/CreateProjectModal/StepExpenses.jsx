import { useState } from 'react';
import CategoryPicker from './CategoryPicker';

const inputCls =
  'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

function AddExpenseRow({ onAdd }) {
  const [draft, setDraft] = useState({
    categoryName: '',
    requestDescription: '',
    requestedAmount: '',
    requestDate: '',
  });

  const set = (f) => (v) => setDraft((d) => ({ ...d, [f]: v }));
  const setEv = (f) => (e) => set(f)(e.target.value);

  const canAdd = draft.categoryName.trim() && draft.requestedAmount;

  const submit = () => {
    if (!canAdd) return;
    onAdd(draft);
    setDraft({ categoryName: '', requestDescription: '', requestedAmount: '', requestDate: '' });
  };

  return (
    <div className="space-y-2">
      <CategoryPicker
        value={draft.categoryName}
        onChange={set('categoryName')}
        placeholder="בחר קטגוריית הוצאה"
      />
      <input
        type="text"
        value={draft.requestDescription}
        onChange={setEv('requestDescription')}
        placeholder="תיאור ההוצאה (אופציונלי)"
        className={inputCls}
      />
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={draft.requestedAmount}
          onChange={setEv('requestedAmount')}
          placeholder="סכום (₪)"
          className={`${inputCls} flex-1`}
        />
        <input
          type="date"
          value={draft.requestDate}
          onChange={setEv('requestDate')}
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          + הוסף
        </button>
      </div>
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
        <AddExpenseRow onAdd={addRow} />
      </div>

      {/* List */}
      {data.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">הוצאות שנוספו ({data.length})</p>
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row._key}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{row.categoryName}</p>
                  {row.requestDescription && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{row.requestDescription}</p>
                  )}
                  {row.requestDate && (
                    <p className="text-xs text-gray-400">{fmtDate(row.requestDate)}</p>
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
