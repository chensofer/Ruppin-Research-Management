import { useState } from 'react';

const inputCls = 'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

// Separate component so its local draft state never causes the list to lose focus
function AddCategoryRow({ onAdd }) {
  const [draft, setDraft] = useState({ categoryName: '', allocatedAmount: '', notes: '' });

  const set = (f) => (e) => setDraft((d) => ({ ...d, [f]: e.target.value }));

  const submit = () => {
    if (!draft.categoryName.trim()) return;
    onAdd(draft);
    setDraft({ categoryName: '', allocatedAmount: '', notes: '' });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft.categoryName}
          onChange={set('categoryName')}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="שם קטגוריה"
          className={`${inputCls} flex-5`}
        />
        <input
          type="number"
          min={0}
          value={draft.allocatedAmount}
          onChange={set('allocatedAmount')}
          placeholder="סכום מוקצה (₪)"
          className={`${inputCls} w-44`}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft.notes}
          onChange={set('notes')}
          placeholder="הערות (אופציונלי)"
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={submit}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הוסף קטגוריה
        </button>
      </div>
    </div>
  );
}

export default function StepBudget({ data, onChange, totalBudget }) {
  const addRow = (draft) =>
    onChange([...data, { ...draft, _key: crypto.randomUUID() }]);

  const removeRow = (key) => onChange(data.filter((r) => r._key !== key));

  const totalBudgetNum = parseFloat(totalBudget) || 0;
  const totalAllocated = data.reduce((sum, r) => sum + (parseFloat(r.allocatedAmount) || 0), 0);
  const mismatch = totalBudgetNum > 0 && Math.abs(totalAllocated - totalBudgetNum) > 0.01;

  return (
    <div className="space-y-4">
      {/* Add category form */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">הוסף קטגוריית תקציב $</h3>
        </div>
        <AddCategoryRow onAdd={addRow} />
      </div>

      {/* Category list */}
      {data.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            קטגוריות תקציב ({data.length})
          </p>
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row._key}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{row.categoryName}</p>
                  {row.notes && <p className="text-xs text-gray-400 mt-0.5">{row.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">
                    {row.allocatedAmount ? fmt(parseFloat(row.allocatedAmount)) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
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

      {/* Budget summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-800">
            {totalBudgetNum > 0 ? fmt(totalBudgetNum) : '—'}
          </span>
          <span className="text-gray-500">:תקציב כולל</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={`font-semibold ${mismatch ? 'text-orange-600' : 'text-primary'}`}>
            {fmt(totalAllocated)}
          </span>
          <span className="text-gray-500">:סה״כ קטגוריות</span>
        </div>

        {mismatch && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 pt-1 border-t border-orange-100 mt-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            סה״כ הקטגוריות לא תואם את התקציב הכולל
          </div>
        )}

        {!mismatch && totalAllocated > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 pt-1 border-t border-green-100 mt-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd" />
            </svg>
            התקציב מאוזן
          </div>
        )}
      </div>
    </div>
  );
}
