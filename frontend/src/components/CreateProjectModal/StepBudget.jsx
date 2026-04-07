import { useState } from 'react';
import CategoryPicker from './CategoryPicker';

const inputCls =
  'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

function AddCategoryRow({ onAdd, remaining }) {
  const [draft, setDraft] = useState({ categoryName: '', allocatedAmount: '' });

  const set = (f) => (v) => setDraft((d) => ({ ...d, [f]: v }));

  const amount = parseFloat(draft.allocatedAmount) || 0;
  const exceedsRemaining = remaining !== null && amount > remaining + 0.01;

  const submit = () => {
    if (!draft.categoryName.trim() || exceedsRemaining) return;
    onAdd(draft);
    setDraft({ categoryName: '', allocatedAmount: '' });
  };

  return (
    <div className="space-y-2">
      <CategoryPicker
        value={draft.categoryName}
        onChange={set('categoryName')}
        placeholder="בחר קטגוריית תקציב"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            min={0}
            value={draft.allocatedAmount}
            onChange={(e) => set('allocatedAmount')(e.target.value)}
            placeholder="סכום מוקצה (₪)"
            className={`${inputCls} ${exceedsRemaining ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {exceedsRemaining && (
            <p className="text-xs text-red-500 mt-1">
              הסכום חורג מהתקציב הפנוי ({fmt(remaining)})
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!draft.categoryName.trim() || exceedsRemaining}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          + הוסף
        </button>
      </div>
    </div>
  );
}

export default function StepBudget({ data, onChange, totalBudget, errors = {} }) {
  const totalBudgetNum = parseFloat(totalBudget) || 0;
  const totalAllocated = data.reduce((s, r) => s + (parseFloat(r.allocatedAmount) || 0), 0);
  const remaining = totalBudgetNum > 0 ? totalBudgetNum - totalAllocated : null;
  const balanced = totalBudgetNum > 0 && Math.abs(totalAllocated - totalBudgetNum) <= 0.01;
  const mismatch = totalBudgetNum > 0 && !balanced;

  const addRow = (draft) => {
    const amount = parseFloat(draft.allocatedAmount) || 0;
    if (remaining !== null && amount > remaining + 0.01) return;
    onChange([...data, { ...draft, _key: crypto.randomUUID() }]);
  };

  const removeRow = (key) => onChange(data.filter((r) => r._key !== key));

  return (
    <div className="space-y-4">
      {/* Balance must-fix error when trying to proceed */}
      {errors.budgetBalance && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {errors.budgetBalance}
        </div>
      )}

      {/* Remaining budget indicator */}
      {totalBudgetNum > 0 && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
          balanced
            ? 'bg-green-50 border-green-200'
            : remaining > 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <span className={`text-sm font-semibold ${
            balanced ? 'text-green-700' : remaining > 0 ? 'text-blue-700' : 'text-red-700'
          }`}>
            {balanced
              ? 'התקציב מאוזן במלואו ✓'
              : remaining > 0
              ? `נותר לחלוקה: ${fmt(remaining)}`
              : `חריגה מהתקציב: ${fmt(Math.abs(remaining))}`}
          </span>
          <span className="text-xs text-gray-500">מתוך {fmt(totalBudgetNum)}</span>
        </div>
      )}

      {/* Add form */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">הוסף קטגוריית תקציב</h3>
        </div>
        <AddCategoryRow onAdd={addRow} remaining={remaining} />
      </div>

      {/* Category list */}
      {data.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">קטגוריות תקציב ({data.length})</p>
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row._key}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{row.categoryName}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">
                    {row.allocatedAmount ? fmt(parseFloat(row.allocatedAmount)) : '—'}
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

      {/* Budget summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-gray-800">{totalBudgetNum > 0 ? fmt(totalBudgetNum) : '—'}</span>
          <span className="text-gray-500">:תקציב מאושר</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={`font-semibold ${mismatch ? 'text-orange-600' : 'text-primary'}`}>{fmt(totalAllocated)}</span>
          <span className="text-gray-500">:סה״כ קטגוריות</span>
        </div>
        {mismatch && totalBudgetNum > 0 && (
          <p className="text-xs text-orange-600 pt-1 border-t border-orange-100">
            יש לאזן את התקציב לפני המעבר לשלב הבא
          </p>
        )}
      </div>
    </div>
  );
}
