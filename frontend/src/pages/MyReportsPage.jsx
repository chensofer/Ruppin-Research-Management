import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMySubmissions, getHourReports, getAssistantProjects } from '../api/hourReportsApi';
import Layout from '../components/Layout';
import MobileSelect from '../components/MobileSelect';
import ExcelJS from 'exceljs';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];


const STATUS_STYLES = {
  'אושר':  { badge: 'bg-green-100 text-green-700 ring-1 ring-green-200',   row: 'border-r-4 border-green-400' },
  'נדחה':  { badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',         row: 'border-r-4 border-red-400' },
  'ממתין': { badge: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200', row: 'border-r-4 border-yellow-400' },
};

function StatusIcon({ status }) {
  if (status === 'אושר') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
  if (status === 'נדחה') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status]?.badge ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-sm font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${style}`}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

function parseDayFromDate(dateStr) {
  if (!dateStr) return null;
  return parseInt(String(dateStr).slice(8, 10), 10);
}

// ── Export helpers ────────────────────────────────────────────────────────────
const PRIMARY  = '003478';
const ACCENT   = '5CB800';
const ALT_BG   = 'EBF0FA';

function styleHeader(cell) {
  cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PRIMARY } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
}
function styleData(cell, isAlt) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FF' + ALT_BG : 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
}

async function exportSubmissionsExcel(submissions, userName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RupResearch';
  wb.modified = new Date();

  const ws = wb.addWorksheet('הדוחות שלי');
  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 4 }];

  const todayStr = new Date().toLocaleDateString('he-IL');

  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = `הדוחות שלי — ${userName || ''}`;
  t.font      = { bold: true, size: 14, color: { argb: 'FF' + PRIMARY } };
  t.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:F2');
  const s = ws.getCell('A2');
  s.value = `יוצא בתאריך: ${todayStr}`;
  s.font      = { size: 10, color: { argb: 'FF64748B' } };
  s.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  ws.getRow(2).height = 18;
  ws.addRow([]);

  const headers = ['חודש', 'שנה', 'מחקר', 'שעות כולל', 'סטטוס', 'הערות'];
  const hRow = ws.addRow(headers);
  hRow.height = 22;
  hRow.eachCell(c => styleHeader(c));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };

  submissions.forEach((s, i) => {
    const r = ws.addRow([
      MONTH_NAMES[(s.month ?? 1) - 1],
      s.year ?? '',
      s.projectNameHe || `מחקר ${s.projectId}`,
      s.totalWorkedHours != null ? Number(s.totalWorkedHours) : '',
      s.approvalStatus || '',
      s.comments || '',
    ]);
    r.height = 20;
    r.eachCell((c, col) => {
      styleData(c, i % 2 === 1);
      if (col === 4 && typeof r.values[4] === 'number') { c.numFmt = '#,##0.0'; c.alignment = { horizontal: 'left' }; }
    });
  });

  ws.columns = [{ width: 12 }, { width: 8 }, { width: 32 }, { width: 14 }, { width: 12 }, { width: 28 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url;
  a.download = `הדוחות_שלי_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSubmissionsPDF(submissions, userName) {
  const todayStr = new Date().toLocaleDateString('he-IL');
  const rows = submissions.map(s => {
    const hours = s.totalWorkedHours != null ? Number(s.totalWorkedHours).toFixed(1) : '—';
    const statusColor = s.approvalStatus === 'אושר' ? '#16a34a' : s.approvalStatus === 'נדחה' ? '#dc2626' : '#b45309';
    return `<tr>
      <td>${MONTH_NAMES[(s.month ?? 1) - 1]} ${s.year ?? ''}</td>
      <td>${s.projectNameHe || `מחקר ${s.projectId}`}</td>
      <td class="num">${hours}</td>
      <td style="color:${statusColor};font-weight:600">${s.approvalStatus || ''}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>הדוחות שלי</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap');
  body{font-family:'Assistant',Arial,sans-serif;direction:rtl;font-size:12px;color:#1e293b;padding:24px;}
  h1{font-size:18px;font-weight:700;color:#003478;margin-bottom:2px;}.sub{font-size:10px;color:#64748b;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;}
  th{background:#003478;color:white;padding:7px 10px;font-size:11px;text-align:right;}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;}
  tr:nth-child(even){background:#f8fafc;}.num{text-align:left;}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}thead{display:table-header-group;}tr{page-break-inside:avoid;}}
  </style></head><body>
  <h1>הדוחות שלי — ${userName || ''}</h1>
  <div class="sub">יוצא בתאריך: ${todayStr} · ${submissions.length} דוחות</div>
  <table><thead><tr><th>תקופה</th><th>מחקר</th><th>שעות</th><th>סטטוס</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>window.print();</script></body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function DayReportsTable({ userId, projectId, month, year }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    getHourReports(userId, projectId, month, year)
      .then((r) => setRows(r.data ?? []))
      .catch(() => setRows([]));
  }, [userId, projectId, month, year]);

  if (rows === null) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">אין רשומות יומיות</p>;
  }

  const total = rows.reduce((sum, r) => sum + (r.workedHours ? Number(r.workedHours) : 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" dir="rtl">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-sm">
            <th className="px-4 py-2 text-right font-medium">יום</th>
            <th className="px-4 py-2 text-right font-medium">משעה</th>
            <th className="px-4 py-2 text-right font-medium">עד שעה</th>
            <th className="px-4 py-2 text-right font-medium">שעות</th>
            <th className="px-4 py-2 text-right font-medium">הערות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const day = parseDayFromDate(r.reportDate);
            const dayOfWeek = day ? new Date(year, month - 1, day).getDay() : null;
            return (
              <tr key={r.hourReportId} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {day}
                  {dayOfWeek !== null && (
                    <span className="text-gray-400 text-sm mr-1.5">({DAY_NAMES[dayOfWeek]})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                  {r.fromHour ? String(r.fromHour).slice(0, 5) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                  {r.toHour ? String(r.toHour).slice(0, 5) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-800 font-semibold tabular-nums">
                  {r.workedHours != null ? Number(r.workedHours).toFixed(1) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{r.comments || ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold text-gray-700">
            <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">סה"כ</td>
            <td className="px-4 py-2 tabular-nums">{total.toFixed(1)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function MyReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getMySubmissions(user.userId),
      getAssistantProjects(user.userId),
    ])
      .then(([subRes, projRes]) => {
        setSubmissions(subRes.data ?? []);
        setAssignedProjects(projRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Project dropdown shows only the assistant's assigned projects
  const projects = assignedProjects.map((p) => ({
    projectId: p.projectId,
    name: p.projectNameHe || p.projectNameEn || `מחקר ${p.projectId}`,
  }));

  const filtered = submissions.filter((s) => {
    const matchStatus  = statusFilter === 'all' || s.approvalStatus === statusFilter;
    const matchProject = projectFilter === 'all' || String(s.projectId) === projectFilter;
    const q = search.trim().toLowerCase();
    const matchSearch  = !q || (s.projectNameHe || '').toLowerCase().includes(q) ||
      MONTH_NAMES[(s.month ?? 1) - 1].includes(q);
    return matchStatus && matchProject && matchSearch;
  });

  // Count badges — reflect the current project filter
  const counts = filtered.reduce((acc, s) => {
    acc[s.approvalStatus] = (acc[s.approvalStatus] ?? 0) + 1;
    return acc;
  }, {});

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" dir="rtl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">הדוחות שלי</h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.firstName} {user?.lastName} — כל הדוחות החודשיים שנשלחו לאישור
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {submissions.length > 0 && (
              <>
                <button
                  onClick={() => exportSubmissionsExcel(filtered, `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={() => exportSubmissionsPDF(filtered, `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDF
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              חזרה לדיווח נוכחות
            </button>
          </div>
        </div>

        {/* Summary cards — also serve as status filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
              statusFilter === 'all'
                ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            הכל ({submissions.length})
          </button>
          {[
            { label: 'ממתין לאישור', status: 'ממתין', bg: 'linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)', border: 'border-yellow-200', ring: 'ring-yellow-300', num: 'text-yellow-700' },
            { label: 'אושרו',        status: 'אושר',  bg: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)', border: 'border-green-200',  ring: 'ring-green-300',  num: 'text-green-700' },
            { label: 'נדחו',         status: 'נדחה',  bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', border: 'border-red-200',    ring: 'ring-red-300',    num: 'text-red-700' },
          ].map(({ label, status, bg, border, ring, num }) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter((prev) => prev === status ? 'all' : status)}
                style={{ background: bg }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${border} ${active ? `ring-2 ${ring} shadow-sm` : 'hover:shadow-sm'}`}
              >
                <span className={num}><StatusIcon status={status} /></span>
                <span className={num}>{counts[status] ?? 0}</span>
                <span className="text-gray-600">{label}</span>
              </button>
            );
          })}

          {/* Project filter */}
          {projects.length > 0 && (
            <MobileSelect
              value={projectFilter === 'all' ? '' : projectFilter}
              onChange={(v) => setProjectFilter(v || 'all')}
              placeholder="כל המחקרים"
              options={projects.map((p) => ({ value: String(p.projectId), label: p.name }))}
              searchable
              searchPlaceholder="חיפוש מחקר לפי שם..."
            />
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם מחקר או חודש..."
            className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-gray-400"
            dir="rtl"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-400">
              {submissions.length === 0 ? 'טרם נשלחו דוחות' : 'אין דוחות התואמים לסינון הנבחר'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isExpanded = expandedId === s.monthlyApprovalId;
              const styles = STATUS_STYLES[s.approvalStatus] ?? {};
              return (
                <div
                  key={s.monthlyApprovalId}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${styles.row ?? ''}`}
                >
                  {/* Row header */}
                  <button
                    onClick={() => toggleExpand(s.monthlyApprovalId)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors text-right"
                  >
                    {/* RIGHT: month + year + project */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">
                        {MONTH_NAMES[(s.month ?? 1) - 1]} {s.year}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {s.projectNameHe || `מחקר ${s.projectId}`}
                      </p>
                    </div>

                    {/* LEFT: status + hours + chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={s.approvalStatus} />
                      {s.totalWorkedHours != null && (
                        <span className="text-sm font-bold text-gray-700 tabular-nums">
                          {Number(s.totalWorkedHours).toFixed(1)}
                          <span className="text-sm font-normal text-gray-400 mr-0.5">שעות</span>
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : '-rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Rejection comment */}
                  {s.approvalStatus === 'נדחה' && s.comments && (
                    <div className="px-5 pb-3">
                      <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-700">
                        <span className="font-medium">סיבת הדחייה: </span>{s.comments}
                      </div>
                    </div>
                  )}

                  {/* Expanded day-level detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <DayReportsTable
                        userId={user.userId}
                        projectId={s.projectId}
                        month={s.month}
                        year={s.year}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
