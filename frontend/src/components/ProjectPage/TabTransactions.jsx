const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

function StatusBadge({ status }) {
  const styles = {
    'אושר': 'bg-green-100 text-green-700',
    'שולם': 'bg-green-100 text-green-700',
    'נדחה': 'bg-red-100 text-red-700',
    'ממתין': 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'ממתין'}
    </span>
  );
}

export default function TabTransactions({ payments, totalBudget }) {
  // Build ledger: sort by date, compute running balance
  const sorted = [...payments].sort((a, b) => {
    const da = a.requestDate ? new Date(a.requestDate) : 0;
    const db = b.requestDate ? new Date(b.requestDate) : 0;
    return da - db;
  });

  let running = totalBudget || 0;
  const rows = sorted.map((p) => {
    const amount = p.status === 'אושר' || p.status === 'שולם' ? (p.requestedAmount || 0) : 0;
    running -= amount;
    return { ...p, deducted: amount, balance: running };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">* רק בקשות שאושרו מנוכות מהיתרה</span>
        <span className="text-sm font-semibold text-gray-700">ספר הזמנות ({payments.length})</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">אין עסקאות עדיין</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-right font-medium">תאריך</th>
                <th className="px-5 py-3 text-right font-medium">כותרת</th>
                <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                <th className="px-5 py-3 text-right font-medium">סכום</th>
                <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                <th className="px-5 py-3 text-right font-medium">יתרה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.paymentRequestId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-500">{fmtDate(r.requestDate)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {r.requestTitle || `בקשה #${r.paymentRequestId}`}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{r.categoryName || '—'}</td>
                  <td className="px-5 py-3.5 font-medium text-red-600">
                    {r.deducted > 0 ? `−${fmt(r.deducted)}` : fmt(r.requestedAmount)}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  <td className={`px-5 py-3.5 font-semibold ${r.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
