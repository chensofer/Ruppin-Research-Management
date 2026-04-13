import { useState } from 'react';
import * as XLSX from 'xlsx';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');
const fmtNum  = (n) => (n != null ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n) : '');

const WAGE_CATEGORY = 'שכר לעוזרי מחקר';

function ExpandedDetails({ row }) {
  const isWage = row.categoryName === WAGE_CATEGORY;

  if (isWage) {
    return (
      <tr className="bg-blue-50/30">
        <td colSpan={6} className="px-10 py-3">
          <div className="text-xs">
            <dt className="text-gray-400 mb-0.5">עוזר מחקר שקיבל תשלום</dt>
            <dd className="text-gray-700 font-medium">
              {row.requestedByUserName || row.requestedByUserId || '—'}
            </dd>
          </div>
        </td>
      </tr>
    );
  }

  const files = row.quotationFilePath
    ? row.quotationFilePath.split(';').filter(Boolean)
    : [];

  return (
    <tr className="bg-blue-50/30">
      <td colSpan={6} className="px-10 py-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {row.providerName && (
            <div>
              <dt className="text-gray-400 mb-0.5">שם ספק</dt>
              <dd className="text-gray-700 font-medium">{row.providerName}</dd>
            </div>
          )}
          {row.requestDescription && (
            <div className={row.providerName ? '' : 'col-span-2'}>
              <dt className="text-gray-400 mb-0.5">תיאור</dt>
              <dd className="text-gray-700">{row.requestDescription}</dd>
            </div>
          )}
          {files.length > 0 && (
            <div className="col-span-2">
              <dt className="text-gray-400 mb-1">קבצי הצעת מחיר</dt>
              <dd className="flex flex-wrap gap-2">
                {files.map((path, i) => {
                  const name = path.split('/').pop();
                  return (
                    <a
                      key={i}
                      href={`http://localhost:5269${path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {name}
                    </a>
                  );
                })}
              </dd>
            </div>
          )}
          {!row.providerName && !row.requestDescription && files.length === 0 && (
            <p className="col-span-2 text-gray-400">אין פרטים נוספים</p>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TabTransactions({ payments, totalBudget, projectName }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Filter only approved / paid transactions
  const approved = payments.filter(
    (p) => p.status === 'אושר' || p.status === 'שולם'
  );

  // Compute running balance on chronological (oldest-first) order
  const oldestFirst = [...approved].sort((a, b) => a.paymentRequestId - b.paymentRequestId);
  let running = totalBudget || 0;
  const withBalance = oldestFirst.map((p) => {
    const amount = p.requestedAmount || 0;
    running -= amount;
    return { ...p, amount, balance: running };
  });

  // Display newest first
  const allRows = [...withBalance].reverse();

  // Apply date range filter
  const rows = allRows.filter((r) => {
    if (!r.requestDate) return true;
    const d = String(r.requestDate).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  // ── Excel export ────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('he-IL');
    const todayISO = today.toISOString().slice(0, 10);

    // ── Metadata rows ──────────────────────────────────────────────────────────
    const metaRows = [
      [`ריכוז תנועות — ${projectName || 'מחקר'}`],
      [`יוצא בתאריך: ${todayStr}`],
    ];

    if (fromDate || toDate) {
      const range = [fromDate ? `מ-${fromDate}` : '', toDate ? `עד ${toDate}` : ''].filter(Boolean).join('  ');
      metaRows.push([`טווח תאריכים: ${range}`]);
    }

    metaRows.push([]); // blank separator

    // ── Column headers ─────────────────────────────────────────────────────────
    const headers = [
      'תאריך',
      'כותרת',
      'קטגוריה',
      'ספק / מבצע',
      'פירוט',
      'סכום (₪)',
      'יתרה (₪)',
    ];

    // ── Data rows ──────────────────────────────────────────────────────────────
    const dataRows = rows.map((r) => [
      r.requestDate ? String(r.requestDate).slice(0, 10) : '',
      r.requestTitle || `בקשה #${r.paymentRequestId}`,
      r.categoryName || '',
      // Wage rows: show assistant name. Regular rows: show provider name.
      r.categoryName === WAGE_CATEGORY
        ? (r.requestedByUserName || r.requestedByUserId || '')
        : (r.providerName || ''),
      r.requestDescription || '',
      r.amount || 0,    // numeric — Excel can sort/sum
      r.balance || 0,   // numeric
    ]);

    // ── Summary rows ───────────────────────────────────────────────────────────
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const summaryRows = [
      [],
      ['', '', '', '', 'סה"כ עסקאות:', rows.length, ''],
      ['', '', '', '', 'סה"כ הוצאות (₪):', totalAmount, ''],
      ['', '', '', '', 'תקציב כולל (₪):', totalBudget || 0, ''],
    ];

    // ── Assemble sheet ─────────────────────────────────────────────────────────
    const aoa = [...metaRows, headers, ...dataRows, ...summaryRows];
    const ws  = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths (characters)
    ws['!cols'] = [
      { wch: 13 }, // date
      { wch: 34 }, // title
      { wch: 22 }, // category
      { wch: 24 }, // provider/executor
      { wch: 32 }, // description
      { wch: 15 }, // amount
      { wch: 15 }, // balance
    ];

    // Mark amount and balance columns as numbers with comma formatting
    // (the cells already contain JS numbers, xlsx infers type automatically)

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ריכוז תנועות');

    // Safe filename (strip chars illegal in filenames)
    const safeName = (projectName || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    const filename  = safeName
      ? `ריכוז_תנועות_${safeName}_${todayISO}.xlsx`
      : `ריכוז_תנועות_${todayISO}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">כולל הוצאות שאושרו ושולמו בלבד</span>
          {/* Export button */}
          <button
            type="button"
            onClick={exportToExcel}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="ייצוא לאקסל"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            ייצוא לאקסל
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          ריכוז תנועות ({rows.length})
        </span>
      </div>

      {/* Date range filter */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50/60">
        <span className="text-xs text-gray-500 font-medium">סינון לפי תאריך:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">מ-</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">עד</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">נקה</button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          {allRows.length === 0 ? 'אין עסקאות מאושרות עדיין' : 'אין עסקאות בטווח התאריכים הנבחר'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-right font-medium w-8" />
                <th className="px-5 py-3 text-right font-medium">תאריך</th>
                <th className="px-5 py-3 text-right font-medium">כותרת</th>
                <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                <th className="px-5 py-3 text-right font-medium">סכום</th>
                <th className="px-5 py-3 text-right font-medium">יתרה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <>
                  <tr
                    key={r.paymentRequestId}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedRow(expandedRow === r.paymentRequestId ? null : r.paymentRequestId)
                    }
                  >
                    <td className="px-5 py-3.5 text-gray-400">
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedRow === r.paymentRequestId ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(r.requestDate)}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {r.requestTitle || `בקשה #${r.paymentRequestId}`}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.categoryName || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-red-600">
                      {r.amount > 0 ? `−${fmt(r.amount)}` : '—'}
                    </td>
                    <td className={`px-5 py-3.5 font-semibold ${r.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(r.balance)}
                    </td>
                  </tr>
                  {expandedRow === r.paymentRequestId && (
                    <ExpandedDetails key={`${r.paymentRequestId}-exp`} row={r} />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
