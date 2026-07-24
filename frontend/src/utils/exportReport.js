import ExcelJS from 'exceljs';

const fmt    = (n)  => (n != null ? Number(n) : 0);
const fmtIL  = (n)  => n != null ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(Number(n)) : '';
const fmtDate = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('he-IL'); } catch { return String(d); } };
const todayStr = () => new Date().toLocaleDateString('he-IL');

const TODAY_STR = new Date().toISOString().split('T')[0];
function effectiveStatus(p) {
  const raw = p.status || '';
  const isMarkedActive = raw === 'פעיל' || raw === 'Active' || raw === 'active';
  if (isMarkedActive && p.endDate && String(p.endDate).slice(0, 10) < TODAY_STR) return 'לא פעיל';
  return raw;
}

const PRIMARY  = '003478';
const ACCENT   = '5CB800';
const LIGHT_BG = 'F1F5FA';
const ALT_BG   = 'EBF0FA';

function styleHeader(cell, bgColor = PRIMARY) {
  cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
}

function styleTitle(cell) {
  cell.font      = { bold: true, size: 14, color: { argb: 'FF' + PRIMARY } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
}

function styleSubtitle(cell) {
  cell.font      = { size: 10, color: { argb: 'FF64748B' } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
}

function styleData(cell, isAlt, isNumber = false) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FF' + ALT_BG : 'FFFFFFFF' } };
  cell.alignment = { horizontal: isNumber ? 'left' : 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
  if (isNumber) cell.numFmt = '#,##0.00';
}

function styleSummary(cell) {
  cell.font      = { bold: true, size: 11, color: { argb: 'FF' + PRIMARY } };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_BG } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
}

// ─── Transactions sheet ───────────────────────────────────────────────────────
function addTransactionsSheet(wb, detail, payments) {
  const ws = wb.addWorksheet('ריכוז תנועות');
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  // Title
  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value = `ריכוז תנועות — ${detail.projectNameHe || ''}`;
  styleTitle(t);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:G2');
  const s = ws.getCell('A2');
  s.value = `יוצא בתאריך: ${todayStr()}`;
  styleSubtitle(s);
  ws.getRow(2).height = 18;

  ws.addRow([]); // empty

  // Headers
  const headers = ['תאריך', 'כותרת', 'קטגוריה', 'ספק / מבצע', 'פירוט', 'סכום (₪)', 'יתרה (₪)'];
  const hRow = ws.addRow(headers);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };

  // Data
  const approved = (payments || [])
    .filter(p => p.status === 'אושר' || p.status === 'שולם')
    .sort((a, b) => new Date(a.requestDate || 0) - new Date(b.requestDate || 0));

  let running = fmt(detail.totalBudget);
  let totalPaid = 0;

  approved.forEach((p, i) => {
    running  -= fmt(p.requestedAmount);
    totalPaid += fmt(p.requestedAmount);
    const r = ws.addRow([
      fmtDate(p.requestDate),
      p.requestTitle || '',
      p.categoryName || '',
      p.providerName || '',
      p.requestDescription || '',
      fmt(p.requestedAmount),
      Number(running.toFixed(2)),
    ]);
    r.height = 20;
    r.eachCell((c, col) => styleData(c, i % 2 === 1, col >= 6));
  });

  // Summary
  ws.addRow([]);
  const s1 = ws.addRow(['', '', '', '', 'סה"כ עסקאות:', approved.length, '']);
  const s2 = ws.addRow(['', '', '', '', 'סה"כ הוצאות (₪):', totalPaid, '']);
  const s3 = ws.addRow(['', '', '', '', 'תקציב כולל (₪):', fmt(detail.totalBudget), '']);
  [s1, s2, s3].forEach(r => {
    r.height = 20;
    r.eachCell(c => styleSummary(c));
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(6).alignment = { horizontal: 'left' };
  });

  ws.columns = [
    { width: 13 }, { width: 34 }, { width: 20 }, { width: 22 },
    { width: 30 }, { width: 14 }, { width: 14 },
  ];
}

// ─── Details sheet ────────────────────────────────────────────────────────────
function addDetailsSheet(wb, detail) {
  const ws = wb.addWorksheet('פרטי מחקר');
  ws.views = [{ rightToLeft: true }];
  ws.columns = [{ width: 28 }, { width: 40 }];

  ws.mergeCells('A1:B1');
  const t = ws.getCell('A1');
  t.value = `פרטי מחקר — ${detail.projectNameHe || ''}`;
  styleTitle(t);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:B2');
  const s = ws.getCell('A2');
  s.value = `יוצא בתאריך: ${todayStr()}`;
  styleSubtitle(s);
  ws.getRow(2).height = 18;
  ws.addRow([]);

  const infoRows = [
    ['שם המחקר (עברית)', detail.projectNameHe || ''],
    ['שם המחקר (אנגלית)', detail.projectNameEn || ''],
    ['חוקר ראשי', detail.principalResearcherName || ''],
    ['מרכז מחקר', detail.centerName || ''],
    ['מקור מימון', detail.fundingSource || ''],
    ['תאריך התחלה', fmtDate(detail.startDate)],
    ['תאריך סיום', fmtDate(detail.endDate)],
    ['סטטוס', detail.status || ''],
  ];
  infoRows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.height = 20;
    r.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF' + PRIMARY } };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_BG } };
    r.getCell(1).alignment = { horizontal: 'right', readingOrder: 'rightToLeft' };
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FF' + ALT_BG } };
    r.getCell(2).alignment = { horizontal: 'right', readingOrder: 'rightToLeft' };
  });

  ws.addRow([]);
  const budgetHeader = ws.addRow(['סיכום תקציב', '']);
  budgetHeader.height = 22;
  ws.mergeCells(`A${budgetHeader.number}:B${budgetHeader.number}`);
  styleHeader(budgetHeader.getCell(1), ACCENT);

  const budgetRows = [
    ['תקציב כולל (₪)', fmt(detail.totalBudget)],
    ['הוצאות בפועל (₪)', fmt(detail.totalPaid)],
    ['יתרה לאחר תשלומים (₪)', fmt(detail.remainingBalance)],
    ['התחייבויות עתידיות (₪)', fmt(detail.totalFuture)],
    ['יתרה זמינה (₪)', fmt(detail.availableBalance)],
  ];
  budgetRows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.height = 20;
    r.getCell(1).font = { bold: true, size: 11 };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FF' + ALT_BG } };
    r.getCell(1).alignment = { horizontal: 'right', readingOrder: 'rightToLeft' };
    r.getCell(2).numFmt = '#,##0.00';
    r.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF' + PRIMARY } };
    r.getCell(2).fill = r.getCell(1).fill;
    r.getCell(2).alignment = { horizontal: 'left' };
  });
}

// ─── Generic table sheet ──────────────────────────────────────────────────────
function addTableSheet(wb, name, title, headers, rows, colWidths) {
  const ws = wb.addWorksheet(name);
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  ws.mergeCells(`A1:${String.fromCharCode(64 + headers.length)}1`);
  const t = ws.getCell('A1');
  t.value = title;
  styleTitle(t);
  ws.getRow(1).height = 26;
  ws.mergeCells(`A2:${String.fromCharCode(64 + headers.length)}2`);
  ws.getCell('A2').value = `יוצא בתאריך: ${todayStr()}`;
  styleSubtitle(ws.getCell('A2'));
  ws.getRow(2).height = 16;
  ws.addRow([]);

  const hRow = ws.addRow(headers);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };

  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.height = 20;
    r.eachCell((c, col) => {
      const isNum = typeof row[col - 1] === 'number';
      styleData(c, i % 2 === 1, isNum);
    });
  });

  ws.columns = colWidths.map(w => ({ width: w }));
}

// ─── Action label map (mirrors TabHistory ACTION_META) ────────────────────────
const ACTION_LABELS = {
  project_created: 'יצירת מחקר', project_updated: 'עדכון נתוני מחקר',
  project_archived: 'ארכוב מחקר', project_restored: 'שחזור מחקר',
  team_member_added: 'הוספת חבר צוות', team_member_removed: 'הסרת חבר צוות',
  assistant_added: 'הוספת עוזר מחקר', assistant_removed: 'הסרת עוזר מחקר',
  assistant_created: 'יצירת עוזר מחקר', assistant_updated: 'עדכון עוזר מחקר',
  payment_request_created: 'בקשת תשלום חדשה', payment_approved: 'אישור תשלום',
  payment_rejected: 'דחיית תשלום', payment_paid: 'תשלום בוצע',
  payment_status_updated: 'עדכון סטטוס תשלום',
  hour_report_submitted: 'הגשת דוח שעות', hour_report_approved: 'אישור דוח שעות',
  hour_report_rejected: 'דחיית דוח שעות',
  budget_transferred: 'העברת תקציב', budget_categories_updated: 'עדכון קטגוריות תקציב',
  commitment_added: 'הוספת התחייבות', commitment_updated: 'עדכון התחייבות',
  commitment_deleted: 'מחיקת התחייבות',
  file_uploaded: 'העלאת קובץ', file_deleted: 'מחיקת קובץ',
};
function actionLabel(type) { return ACTION_LABELS[type] ?? type; }

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Documents sheet ──────────────────────────────────────────────────────────
function addDocumentsSheet(wb, files, projectName) {
  const ws = wb.addWorksheet('מסמכים');
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  ws.mergeCells('A1:D1');
  const t = ws.getCell('A1');
  t.value = `מסמכים — ${projectName || ''}`;
  styleTitle(t);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `יוצא בתאריך: ${todayStr()}`;
  styleSubtitle(ws.getCell('A2'));
  ws.getRow(2).height = 16;
  ws.addRow([]);

  const hRow = ws.addRow(['שם הקובץ', 'תיקייה', 'תאריך העלאה', 'קישור']);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 4 } };

  (files ?? []).forEach((f, i) => {
    const r = ws.addRow([f.fileName || '', f.folderName || 'כללי', fmtDate(f.createdDate), f.path ? 'פתח קובץ' : '']);
    r.height = 20;
    r.eachCell((c, col) => styleData(c, i % 2 === 1, false));
    if (f.path) {
      const linkCell = r.getCell(4);
      linkCell.value = { text: 'פתח קובץ', hyperlink: f.path };
      linkCell.font = { color: { argb: 'FF003478' }, underline: true, size: 11 };
      linkCell.alignment = { horizontal: 'right', readingOrder: 'rightToLeft' };
    }
  });

  ws.columns = [{ width: 36 }, { width: 18 }, { width: 15 }, { width: 18 }];
}

// ─── History sheet ────────────────────────────────────────────────────────────
function addHistorySheet(wb, auditLogs, projectName) {
  const ws = wb.addWorksheet('היסטוריית שינויים');
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  ws.mergeCells('A1:E1');
  const t = ws.getCell('A1');
  t.value = `היסטוריית שינויים — ${projectName || ''}`;
  styleTitle(t);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:E2');
  ws.getCell('A2').value = `יוצא בתאריך: ${todayStr()}`;
  styleSubtitle(ws.getCell('A2'));
  ws.getRow(2).height = 16;
  ws.addRow([]);

  const hRow = ws.addRow(['תאריך ושעה', 'מבצע הפעולה', 'מזהה משתמש', 'סוג פעולה', 'תיאור הפעולה']);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 5 } };

  (auditLogs ?? []).forEach((log, i) => {
    const r = ws.addRow([
      formatDateTime(log.createdAt),
      log.performedByName || log.performedByUserId || '',
      log.performedByUserId || '',
      actionLabel(log.actionType),
      log.actionDescription || '',
    ]);
    r.height = 20;
    r.eachCell((c, col) => styleData(c, i % 2 === 1, false));
  });

  ws.columns = [{ width: 20 }, { width: 22 }, { width: 14 }, { width: 22 }, { width: 60 }];
}

// ─── Main Excel export ────────────────────────────────────────────────────────
export async function exportProjectReport({ detail, payments, commitments, files, auditLogs, sections, filename, format = 'excel' }) {
  if (format === 'pdf') { exportProjectPDF({ detail, payments, commitments, sections }); return; }

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'RupResearch';
  wb.modified = new Date();

  if (sections.details)      addDetailsSheet(wb, detail);
  if (sections.transactions && payments?.length) addTransactionsSheet(wb, detail, payments);
  if (sections.payments && payments?.length) {
    const sorted = [...payments].sort((a, b) => (b.paymentRequestId||0) - (a.paymentRequestId||0));
    addTableSheet(wb, 'בקשות תשלום', `בקשות תשלום — ${detail.projectNameHe||''}`,
      ['תאריך', 'כותרת', 'קטגוריה', 'ספק', 'סכום (₪)', 'סטטוס', 'הערות'],
      sorted.map(p => [fmtDate(p.requestDate), p.requestTitle||'', p.categoryName||'', p.providerName||'', fmt(p.requestedAmount), p.status||'', p.comments||'']),
      [13, 30, 20, 20, 13, 10, 25]);
  }
  if (sections.team && detail.teamMembers?.length) {
    addTableSheet(wb, 'צוות המחקר', 'צוות המחקר',
      ['שם', 'ת.ז', 'תפקיד', 'חוקר ראשי'],
      detail.teamMembers.map(m => [`${m.firstName||''} ${m.lastName||''}`.trim(), m.userId||'', m.projectRole||'', m.isPrincipalInvestigator?'✓':'']),
      [24, 14, 22, 10]);
  }
  if (sections.assistants && detail.assistants?.length) {
    addTableSheet(wb, 'עוזרי מחקר', 'עוזרי מחקר',
      ['שם', 'ת.ז', 'תפקיד', 'שכר לשעה (₪)'],
      detail.assistants.map(a => [`${a.firstName||''} ${a.lastName||''}`.trim(), a.assistantUserId||'', a.role||'', fmt(a.salaryPerHour)]),
      [24, 14, 22, 14]);
  }
  if (sections.future && commitments?.length) {
    const active = commitments.filter(c => c.status !== 'בוטל');
    addTableSheet(wb, 'הוצאות עתידיות', 'הוצאות עתידיות',
      ['קטגוריה', 'תיאור', 'סכום צפוי (₪)', 'תאריך צפוי', 'סטטוס'],
      active.map(c => [c.categoryName||'', c.commitmentDescription||'', fmt(c.expectedAmount), fmtDate(c.expectedDate), c.status||'']),
      [22, 32, 15, 14, 12]);
  }
  if (sections.documents && files?.length) {
    addDocumentsSheet(wb, files, detail.projectNameHe || detail.projectNameEn);
  }
  if (sections.history && auditLogs?.length) {
    addHistorySheet(wb, auditLogs, detail.projectNameHe || detail.projectNameEn);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = filename || `דוח_מחקר_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDashboardReport(projects, sections, format = 'excel') {
  if (format === 'pdf') { exportDashboardPDF(projects); return; }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RupResearch';
  const ws = wb.addWorksheet('סיכום מחקרים');
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  ws.mergeCells('A1:I1');
  const t = ws.getCell('A1');
  t.value = `דוח סיכום מחקרים — ${todayStr()}`;
  styleTitle(t);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:I2');
  ws.getCell('A2').value = `${projects.length} מחקרים`;
  styleSubtitle(ws.getCell('A2'));
  ws.getRow(2).height = 16;
  ws.addRow([]);

  const headers = ['שם המחקר', 'חוקר ראשי', 'תאריך התחלה', 'תאריך סיום', 'סטטוס', 'תקציב (₪)', 'שולם (₪)', 'יתרה זמינה (₪)', '% ניצול'];
  const hRow = ws.addRow(headers);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };

  projects.forEach((p, i) => {
    const pct = (p.totalBudget||0) > 0 ? Math.round(((p.totalPaid||0)/p.totalBudget)*100) : 0;
    const r = ws.addRow([p.projectNameHe||p.projectNameEn||'', p.principalResearcherId||'', fmtDate(p.startDate), fmtDate(p.endDate), effectiveStatus(p), fmt(p.totalBudget), fmt(p.totalPaid), fmt(p.availableBalance), `${pct}%`]);
    r.height = 20;
    r.eachCell((c, col) => styleData(c, i % 2 === 1, col >= 6 && col <= 8));
  });

  // Totals
  ws.addRow([]);
  const totals = ws.addRow(['סה"כ', '', '', '', '', projects.reduce((s,p)=>s+fmt(p.totalBudget),0), projects.reduce((s,p)=>s+fmt(p.totalPaid),0), projects.reduce((s,p)=>s+fmt(p.availableBalance),0), '']);
  totals.height = 22;
  totals.eachCell((c, col) => { styleSummary(c); if (col >= 6 && col <= 8) { c.numFmt = '#,##0.00'; c.alignment = { horizontal: 'left' }; } });

  ws.columns = [{wch:32},{wch:16},{wch:13},{wch:13},{wch:10},{wch:15},{wch:15},{wch:17},{wch:9}].map((c,i)=>({width: [32,16,13,13,10,15,15,17,9][i]}));

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = `דוח_מחקרים_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── PDF (print) ──────────────────────────────────────────────────────────────
export function exportProjectPDF({ detail, payments, commitments, sections }) {
  const approved = (payments||[]).filter(p=>p.status==='אושר'||p.status==='שולם').sort((a,b)=>new Date(a.requestDate||0)-new Date(b.requestDate||0));
  let running = fmt(detail.totalBudget), totalPaid = 0;
  const txRows = approved.map(p=>{running-=fmt(p.requestedAmount);totalPaid+=fmt(p.requestedAmount);return`<tr><td>${fmtDate(p.requestDate)}</td><td>${p.requestTitle||''}</td><td>${p.categoryName||''}</td><td>${p.providerName||''}</td><td>${p.requestDescription||''}</td><td class="num">${fmtIL(p.requestedAmount)}</td><td class="num">${fmtIL(running)}</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>דוח מחקר</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Assistant',Arial,sans-serif;direction:rtl;font-size:12px;color:#1e293b;background:white;padding:24px;}
  h1{font-size:18px;font-weight:700;color:#003478;margin-bottom:2px;}h2{font-size:13px;font-weight:700;color:#003478;border-bottom:2px solid #003478;padding-bottom:4px;margin:18px 0 8px;}
  .sub{font-size:10px;color:#64748b;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}th{background:#003478;color:white;padding:7px 10px;font-size:11px;text-align:right;}
  td{padding:6px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;text-align:right;}tr:nth-child(even){background:#f8fafc;}.num{text-align:left;}
  .summary{background:#f1f5f9;border-radius:6px;padding:10px 14px;}.summary-row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px;}
  .budget-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}.budget-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;}
  .budget-card .v{font-size:15px;font-weight:700;color:#003478;}.budget-card .l{font-size:10px;color:#64748b;}
  .info-table td:first-child{font-weight:600;color:#003478;background:#f1f5fb;width:160px;}
  @media print{
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
    thead{display:table-header-group;}
    table{page-break-inside:auto;}
    tr{page-break-inside:avoid;}
    h2{page-break-after:avoid;}
  }</style></head><body>
  <h1>${detail.projectNameHe||''}</h1><div class="sub">דוח מחקר &nbsp;·&nbsp; יוצא בתאריך: ${todayStr()}</div>
  ${sections.details?`<h2>פרטי מחקר</h2>
  <table class="info-table"><tbody>
  <tr><td>חוקר ראשי</td><td>${detail.principalResearcherName||'—'}</td><td>מרכז מחקר</td><td>${detail.centerName||'—'}</td></tr>
  <tr><td>מקור מימון</td><td>${detail.fundingSource||'—'}</td><td>סטטוס</td><td>${detail.status||'—'}</td></tr>
  <tr><td>תאריך התחלה</td><td>${fmtDate(detail.startDate)}</td><td>תאריך סיום</td><td>${fmtDate(detail.endDate)}</td></tr>
  </tbody></table>
  <div class="budget-grid">
  <div class="budget-card"><div class="v">₪${fmtIL(detail.totalBudget)}</div><div class="l">תקציב כולל</div></div>
  <div class="budget-card"><div class="v" style="color:#ef4444">₪${fmtIL(detail.totalPaid)}</div><div class="l">הוצאות בפועל</div></div>
  <div class="budget-card"><div class="v" style="color:#f59e0b">₪${fmtIL(detail.totalFuture)}</div><div class="l">התחייבויות עתידיות</div></div>
  <div class="budget-card"><div class="v" style="color:#16a34a">₪${fmtIL(detail.availableBalance)}</div><div class="l">יתרה זמינה</div></div>
  </div>`:''}
  ${sections.transactions&&approved.length?`<h2>ריכוז תנועות</h2>
  <table><thead><tr><th>תאריך</th><th>כותרת</th><th>קטגוריה</th><th>ספק / מבצע</th><th>פירוט</th><th>סכום (₪)</th><th>יתרה (₪)</th></tr></thead><tbody>${txRows}</tbody></table>
  <div class="summary"><div class="summary-row"><span>סה"כ עסקאות</span><strong>${approved.length}</strong></div><div class="summary-row"><span>סה"כ הוצאות</span><strong>₪${fmtIL(totalPaid)}</strong></div><div class="summary-row"><span>תקציב כולל</span><strong>₪${fmtIL(detail.totalBudget)}</strong></div></div>`:''}
  ${sections.team&&detail.teamMembers?.length?`<h2>צוות המחקר</h2><table><thead><tr><th>שם</th><th>ת.ז</th><th>תפקיד</th><th>חוקר ראשי</th></tr></thead><tbody>${detail.teamMembers.map(m=>`<tr><td>${m.firstName||''} ${m.lastName||''}</td><td>${m.userId||''}</td><td>${m.projectRole||''}</td><td>${m.isPrincipalInvestigator?'✓':''}</td></tr>`).join('')}</tbody></table>`:''}
  ${sections.assistants&&detail.assistants?.length?`<h2>עוזרי מחקר</h2><table><thead><tr><th>שם</th><th>ת.ז</th><th>תפקיד</th><th>שכר לשעה (₪)</th></tr></thead><tbody>${detail.assistants.map(a=>`<tr><td>${a.firstName||''} ${a.lastName||''}</td><td>${a.assistantUserId||''}</td><td>${a.role||''}</td><td class="num">${fmtIL(a.salaryPerHour)}</td></tr>`).join('')}</tbody></table>`:''}
  ${sections.future&&commitments?.filter(c=>c.status!=='בוטל').length?`<h2>הוצאות עתידיות</h2><table><thead><tr><th>קטגוריה</th><th>תיאור</th><th>סכום צפוי (₪)</th><th>תאריך צפוי</th><th>סטטוס</th></tr></thead><tbody>${commitments.filter(c=>c.status!=='בוטל').map(c=>`<tr><td>${c.categoryName||''}</td><td>${c.commitmentDescription||''}</td><td class="num">${fmtIL(c.expectedAmount)}</td><td>${fmtDate(c.expectedDate)}</td><td>${c.status||''}</td></tr>`).join('')}</tbody></table>`:''}
  <script>window.onload=()=>window.print();</script></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
}

export function exportDashboardPDF(projects) {
  const rows=projects.map(p=>{const pct=(p.totalBudget||0)>0?Math.round(((p.totalPaid||0)/p.totalBudget)*100):0;return`<tr><td>${p.projectNameHe||p.projectNameEn||''}</td><td>${fmtDate(p.startDate)}</td><td>${fmtDate(p.endDate)}</td><td>${effectiveStatus(p)}</td><td class="num">${fmtIL(p.totalBudget)}</td><td class="num">${fmtIL(p.totalPaid)}</td><td class="num">${fmtIL(p.availableBalance)}</td><td class="num">${pct}%</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>דוח מחקרים</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap');
  body{font-family:'Assistant',Arial,sans-serif;direction:rtl;font-size:12px;padding:24px;}
  h1{font-size:18px;color:#003478;margin-bottom:2px;}.sub{color:#64748b;font-size:10px;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;}th{background:#003478;color:white;padding:7px 10px;font-size:11px;text-align:right;}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;}tr:nth-child(even){background:#f8fafc;}.num{text-align:left;}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}thead{display:table-header-group;}tr{page-break-inside:avoid;}table{page-break-inside:auto;}}</style></head><body>
  <h1>דוח סיכום מחקרים</h1><div class="sub">יוצא בתאריך: ${todayStr()} &nbsp;·&nbsp; ${projects.length} מחקרים</div>
  <table><thead><tr><th>שם המחקר</th><th>תאריך התחלה</th><th>תאריך סיום</th><th>סטטוס</th><th>תקציב (₪)</th><th>שולם (₪)</th><th>יתרה זמינה (₪)</th><th>% ניצול</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>window.print();</script></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
}
