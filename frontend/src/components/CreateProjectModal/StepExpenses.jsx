const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

function newRow() {
  return {
    _key: crypto.randomUUID(),
    requestTitle: '',
    requestDescription: '',
    requestedAmount: '',
    requestDate: '',
    categoryName: '',
  };
}

export default function StepExpenses({ data, onChange }) {
  const update = (key, field, value) =>
    onChange(data.map((r) => (r._key === key ? { ...r, [field]: value } : r)));

  const addRow = () => onChange([...data, newRow()]);

  const removeRow = (key) => onChange(data.filter((r) => r._key !== key));

  const total = data.reduce((sum, r) => sum + (parseFloat(r.requestedAmount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">הוסף הוצאה שכבר שולמה</h3>
        </div>

        <div className="space-y-3">
          {data.map((row) => (
            <div key={row._key} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={row.requestTitle}
                  onChange={(e) => update(row._key, 'requestTitle', e.target.value)}
                  placeholder="כותרת ההוצאה"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={row.categoryName}
                  onChange={(e) => update(row._key, 'categoryName', e.target.value)}
                  placeholder="קטגוריה (לדוגמה: שכ״מ, ציוד)"
                  className={inputCls}
                />
              </div>
              <input
                type="text"
                value={row.requestDescription}
                onChange={(e) => update(row._key, 'requestDescription', e.target.value)}
                placeholder="תיאור"
                className={inputCls}
              />
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  value={row.requestedAmount}
                  onChange={(e) => update(row._key, 'requestedAmount', e.target.value)}
                  placeholder="סכום (₪)"
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="date"
                  value={row.requestDate}
                  onChange={(e) => update(row._key, 'requestDate', e.target.value)}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(row._key)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הוסף הוצאה
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">ניתן לדלג על שלב זה אם אין הוצאות</p>
      )}

      {total > 0 && (
        <div className="flex justify-end">
          <div className="bg-red-50 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg">
            סה״כ הוצאות: ₪{new Intl.NumberFormat('he-IL').format(total)}
          </div>
        </div>
      )}
    </div>
  );
}
