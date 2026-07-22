import { useState } from 'react';
import ExcelJS from 'exceljs';
import HebrewDatePicker from '../HebrewDatePicker';

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
          <div className="text-sm">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

  // Financial transactions — affect the running balance
  const approved = payments.filter(p => p.status === 'אושר' || p.status === 'שולם');

  // Budget transfer records — informational only, TotalBudget is adjusted directly on the project
  const transferRecords = payments.filter(p => p.status === 'העברה');

  // Running balance: chronological order, starting from total budget
  const oldestFirst = [...approved].sort((a, b) => a.paymentRequestId - b.paymentRequestId);
  let running = totalBudget || 0;
  const withBalance = oldestFirst.map(p => {
    const amount = p.requestedAmount || 0;
    running -= amount;
    return { ...p, amount, balance: running };
  });

  // Transfer rows carry no running balance (budget change already baked into TotalBudget)
  const transfersForDisplay = transferRecords.map(t => ({
    ...t,
    amount: t.requestedAmount || 0,
    balance: null,
    isTransfer: true,
  }));

  // Combine newest-first
  const allRows = [
    ...withBalance.reverse(),
    ...transfersForDisplay,
  ].sort((a, b) => b.paymentRequestId - a.paymentRequestId);

  // Apply date range filter
  const rows = allRows.filter(r => {
    if (!r.requestDate) return true;
    const d = String(r.requestDate).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  // ── Excel export ────────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    const today    = new Date();
    const todayStr = today.toLocaleDateString('he-IL');
    const todayISO = today.toISOString().slice(0, 10);

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'מערכת ניהול מחקר';
    wb.created  = today;

    const ws = wb.addWorksheet('ריכוז תנועות', {
      views: [{ rightToLeft: true }],   // ← RTL sheet direction
    });

    // Column definitions (width in characters)
    ws.columns = [
      { width: 13 }, // תאריך
      { width: 36 }, // כותרת
      { width: 22 }, // קטגוריה
      { width: 26 }, // ספק / מבצע
      { width: 34 }, // פירוט
      { width: 16 }, // סכום
      { width: 16 }, // יתרה
    ];

    // Shared alignment for all RTL text cells
    const rtl  = { horizontal: 'right', readingOrder: 2, wrapText: false };
    const rtlW = { ...rtl, wrapText: true };

    const applyRtl = (row, overrides = []) => {
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.alignment = overrides[col - 1] ?? rtl;
      });
    };

    // ── Metadata ──────────────────────────────────────────────────────────────
    const titleRow = ws.addRow([`ריכוז תנועות — ${projectName || 'מחקר'}`]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, 7);
    titleRow.getCell(1).alignment = rtl;
    titleRow.getCell(1).font = { bold: true, size: 14 };

    const dateRow = ws.addRow([`יוצא בתאריך: ${todayStr}`]);
    ws.mergeCells(dateRow.number, 1, dateRow.number, 7);
    dateRow.getCell(1).alignment = rtl;
    dateRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };

    if (fromDate || toDate) {
      const range = [fromDate ? `מ-${fromDate}` : '', toDate ? `עד ${toDate}` : '']
        .filter(Boolean).join('  ');
      const rangeRow = ws.addRow([`טווח תאריכים: ${range}`]);
      ws.mergeCells(rangeRow.number, 1, rangeRow.number, 7);
      rangeRow.getCell(1).alignment = rtl;
      rangeRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
    }

    ws.addRow([]); // blank separator

    // ── Column headers ─────────────────────────────────────────────────────────
    const headerRow = ws.addRow(['תאריך', 'כותרת', 'קטגוריה', 'ספק / מבצע', 'פירוט', 'סכום (₪)', 'יתרה (₪)']);
    applyRtl(headerRow);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EBF5' } };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF003478' } } };
    });
    headerRow.height = 22;

    // ── Data rows ──────────────────────────────────────────────────────────────
    rows.forEach((r) => {
      const dataRow = ws.addRow([
        r.requestDate ? String(r.requestDate).slice(0, 10) : '',
        r.requestTitle || `בקשה #${r.paymentRequestId}`,
        r.categoryName || '',
        r.categoryName === WAGE_CATEGORY
          ? (r.requestedByUserName || r.requestedByUserId || '')
          : (r.providerName || ''),
        r.requestDescription || '',
        r.amount   ?? 0,
        r.balance  ?? 0,
      ]);
      // Per-column alignment: title (col2) and description (col5) wrap
      applyRtl(dataRow, [rtl, rtlW, rtl, rtl, rtlW, rtl, rtl]);
      // Numeric format for amount + balance
      dataRow.getCell(6).numFmt = '#,##0.00';
      dataRow.getCell(7).numFmt = '#,##0.00';
    });

    // ── Summary rows ───────────────────────────────────────────────────────────
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    ws.addRow([]);

    [
      [`סה"כ עסקאות:`,    rows.length,         ''],
      [`סה"כ הוצאות (₪):`, totalAmount,         ''],
      [`תקציב כולל (₪):`,  totalBudget || 0,    ''],
    ].forEach(([label, value]) => {
      const sumRow = ws.addRow(['', '', '', '', label, value, '']);
      sumRow.getCell(5).alignment = rtl;
      sumRow.getCell(5).font      = { bold: true };
      sumRow.getCell(6).alignment = { horizontal: 'right', readingOrder: 2 };
      sumRow.getCell(6).numFmt    = '#,##0.00';
      sumRow.getCell(7).alignment = rtl;
    });

    // ── Export ─────────────────────────────────────────────────────────────────
    const safeName = (projectName || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    const filename  = safeName
      ? `ריכוז_תנועות_${safeName}_${todayISO}.xlsx`
      : `ריכוז_תנועות_${todayISO}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <span className="text-sm font-semibold text-gray-700">
          ריכוז תנועות ({rows.length})
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">הוצאות שאושרו + העברות תקציב</span>
        </div>
      </div>

      {/* Date range filter */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50/60">
        <span className="text-sm text-gray-500 font-medium">סינון לפי תאריך:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-gray-400">מ-</label>
          <HebrewDatePicker
            value={fromDate}
            onChange={setFromDate}
            placeholder="מ-"
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
            wrapperClassName=""
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-gray-400">עד</label>
          <HebrewDatePicker
            value={toDate}
            onChange={setToDate}
            placeholder="עד"
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
            wrapperClassName=""
          />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); }}
            className="text-sm text-gray-400 hover:text-gray-600 underline">נקה</button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          {allRows.length === 0 ? 'אין עסקאות מאושרות עדיין' : 'אין עסקאות בטווח התאריכים הנבחר'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-sm">
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
                    <td className={`px-5 py-3.5 font-medium ${
                      r.isTransfer
                        ? r.amount < 0 ? 'text-blue-600' : 'text-blue-500'
                        : r.amount < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {r.amount > 0
                        ? (r.isTransfer ? `−${fmt(r.amount)}` : `−${fmt(r.amount)}`)
                        : r.amount < 0
                          ? `+${fmt(-r.amount)}`
                          : '—'}
                    </td>
                    <td className={`px-5 py-3.5 font-semibold ${r.balance == null ? 'text-gray-400' : r.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {r.balance == null ? '—' : fmt(r.balance)}
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
