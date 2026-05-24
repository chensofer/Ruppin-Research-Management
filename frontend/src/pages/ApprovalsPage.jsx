import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingPaymentRequests, updatePaymentRequestStatus } from '../api/paymentRequestsApi';
import { getPendingHourApprovals, decideMonthlyApproval } from '../api/hourReportsApi';
import Layout from '../components/Layout';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';
import { celebrate } from '../utils/celebrate';

const MONTH_NAMES = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatDate(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d)) return dateVal;
  return d.toLocaleDateString('he-IL');
}

function formatAmount(amount) {
  if (amount == null) return '—';
  return `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(Number(amount))}`;
}

function ActionRow({ onApprove, onReject, busy }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (rejecting) {
    return (
      <div className="space-y-2 pt-1">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="סיבת הדחייה (אופציונלי)"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400 placeholder-gray-400 transition-all"
        />
        <div className="flex gap-2">
          <button
            onClick={async () => { await onReject(reason); setRejecting(false); setReason(''); }}
            disabled={busy}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {busy ? 'שולח...' : 'אישור דחייה'}
          </button>
          <button
            onClick={() => { setRejecting(false); setReason(''); }}
            disabled={busy}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onApprove}
        disabled={busy}
        className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {busy ? 'מאשר...' : 'אישור'}
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={busy}
        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        דחייה
      </button>
    </div>
  );
}

function RequestCard({ request, onApprove, onReject }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const quotationFiles = request.quotationFilePath
    ? request.quotationFilePath.split(';').filter(Boolean)
    : [];
  const hasDetails = request.providerName || request.requestDescription || quotationFiles.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      {/* Accent stripe */}
      <div className="h-1 bg-gradient-to-l from-primary to-primary-mid" />

      <div className="p-5 space-y-3">
        {/* Title + Amount */}
        <div className="flex items-start justify-between gap-3" dir="rtl">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 leading-snug">
              {request.requestTitle || 'בקשה ללא כותרת'}
            </h4>
            {request.categoryName && (
              <span className="inline-block mt-1.5 text-xs font-semibold bg-primary-light text-primary px-2.5 py-0.5 rounded-full">
                {request.categoryName}
              </span>
            )}
          </div>
          <div className="flex-shrink-0 text-left">
            <p className="text-xl font-extrabold text-gray-900 tabular-nums">
              {formatAmount(request.requestedAmount)}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400" dir="rtl">
          {(request.requestedByUserName || request.requestedByUserId) && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-600 font-medium">{request.requestedByUserName || request.requestedByUserId}</span>
            </span>
          )}
          {request.requestDate && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(request.requestDate)}
            </span>
          )}
        </div>

        {/* Expand button */}
        {hasDetails && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors font-medium"
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'הסתר פרטים' : 'פרטים נוספים'}
          </button>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3.5 space-y-2.5 text-xs" dir="rtl">
            {request.providerName && (
              <div>
                <p className="text-gray-400 font-medium mb-0.5">ספק</p>
                <p className="text-gray-700 font-semibold">{request.providerName}</p>
              </div>
            )}
            {request.requestDescription && (
              <div>
                <p className="text-gray-400 font-medium mb-0.5">תיאור</p>
                <p className="text-gray-700 leading-relaxed">{request.requestDescription}</p>
              </div>
            )}
            {quotationFiles.length > 0 && (
              <div>
                <p className="text-gray-400 font-medium mb-1.5">קבצים מצורפים</p>
                <div className="flex flex-wrap gap-1.5">
                  {quotationFiles.map((path, i) => (
                    <a key={i} href={`http://localhost:5269${path}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary bg-primary-light hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {path.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <ActionRow
          busy={busy}
          onApprove={async () => { setBusy(true); await onApprove(request.paymentRequestId); setBusy(false); }}
          onReject={async (reason) => { setBusy(true); await onReject(request.paymentRequestId, reason); setBusy(false); }}
        />
      </div>
    </div>
  );
}

function HourApprovalCard({ record, onDecide }) {
  const [busy, setBusy] = useState(false);
  const [budgetError, setBudgetError] = useState('');

  const fmtCurrency = (n) => n != null
    ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : null;

  const paymentAmount = record.totalPaymentAmount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      {/* Accent stripe */}
      <div className="h-1 bg-gradient-to-l from-accent to-accent-dark" />

      <div className="p-5 space-y-3">
        {/* Name + Hours/Amount */}
        <div className="flex items-start justify-between gap-3" dir="rtl">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900">
              {record.userName || record.userId}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {MONTH_NAMES[record.month]} {record.year}
            </p>
          </div>
          <div className="flex-shrink-0 text-left space-y-0.5">
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums leading-none">
              {record.totalWorkedHours ?? '—'}
            </p>
            <p className="text-xs text-gray-400 text-left">שעות</p>
            {paymentAmount != null && (
              <p className="text-sm font-bold text-accent-dark tabular-nums">{fmtCurrency(paymentAmount)}</p>
            )}
            {record.salaryPerHour != null && (
              <p className="text-xs text-gray-400">{fmtCurrency(record.salaryPerHour)}/שע׳</p>
            )}
          </div>
        </div>

        {/* Budget error */}
        {budgetError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl" dir="rtl">
            {budgetError}
          </div>
        )}

        {record.comments && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2" dir="rtl">{record.comments}</p>
        )}

        {/* Actions */}
        <ActionRow
          busy={busy}
          onApprove={async () => {
            setBusy(true);
            setBudgetError('');
            const err = await onDecide(record.monthlyApprovalId, 'אושר', null);
            if (err) setBudgetError(err);
            setBusy(false);
          }}
          onReject={async (reason) => {
            setBusy(true);
            setBudgetError('');
            const err = await onDecide(record.monthlyApprovalId, 'נדחה', reason);
            if (err) setBudgetError(err);
            setBusy(false);
          }}
        />
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterProjectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId'), 10) : null;

  const [tab, setTab] = useState('payments');
  const [requests, setRequests] = useState([]);
  const [hourRecords, setHourRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, hRes] = await Promise.all([
        getPendingPaymentRequests(),
        user?.userId ? getPendingHourApprovals(user.userId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setRequests(pRes.data);
      setHourRecords(hRes.data);

      // Push notification when there are pending items
      const totalPending = (pRes.data?.length ?? 0) + (hRes.data?.length ?? 0);
      if (totalPending > 0) {
        const granted = await requestNotificationPermission();
        if (granted) {
          sendNotification(
            `יש ${totalPending} בקשות ממתינות לאישור`,
            `${pRes.data?.length ?? 0} בקשות תשלום · ${hRes.data?.length ?? 0} דוחות שעות`
          );
        }
      }
    } catch {
      setError('שגיאה בטעינת הבקשות');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await updatePaymentRequestStatus(id, { status: 'אושר', approvedByUserId: user?.userId });
      setRequests((prev) => prev.filter((r) => r.paymentRequestId !== id));
      celebrate('payment_approved');
    } catch { showToast('שגיאה באישור הבקשה'); }
  };

  const handleReject = async (id, reason) => {
    try {
      await updatePaymentRequestStatus(id, { status: 'נדחה', approvedByUserId: user?.userId, rejectionReason: reason || null });
      setRequests((prev) => prev.filter((r) => r.paymentRequestId !== id));
      showToast('הבקשה נדחתה');
    } catch { showToast('שגיאה בדחיית הבקשה'); }
  };

  const handleHourDecide = async (id, status, comments) => {
    try {
      await decideMonthlyApproval(id, { approvalStatus: status, approvedByUserId: user?.userId, comments: comments || null });
      setHourRecords((prev) => prev.filter((r) => r.monthlyApprovalId !== id));
      if (status === 'אושר') celebrate('hours_approved');
      else showToast('שעות נדחו');
      return null;
    } catch (err) {
      const msg = err.response?.data?.message || 'שגיאה בעדכון';
      if (err.response?.status === 400) return msg;
      showToast(msg);
      return null;
    }
  };

  const visibleRequests    = filterProjectId ? requests.filter((r) => r.projectId === filterProjectId) : requests;
  const visibleHourRecords = filterProjectId ? hourRecords.filter((r) => r.projectId === filterProjectId) : hourRecords;

  const filterProjectName = filterProjectId
    ? (visibleRequests[0]?.projectNameHe || visibleHourRecords[0]?.projectNameHe || `מחקר ${filterProjectId}`)
    : null;

  const clearFilter = () => setSearchParams({});

  const paymentGroups = Object.values(visibleRequests.reduce((acc, req) => {
    const key = req.projectId ?? 0;
    if (!acc[key]) acc[key] = { name: req.projectNameHe || req.projectNameEn || `מחקר ${key}`, items: [] };
    acc[key].items.push(req);
    return acc;
  }, {}));

  const hourGroups = Object.values(visibleHourRecords.reduce((acc, rec) => {
    const key = rec.projectId ?? 0;
    if (!acc[key]) acc[key] = { name: rec.projectNameHe || rec.projectNameEn || `מחקר ${key}`, items: [] };
    acc[key].items.push(rec);
    return acc;
  }, {}));

  const EmptyState = ({ text }) => (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-base font-bold text-gray-700">הכל מעודכן!</p>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" dir="rtl">

        {/* Header */}
        <div className="mb-7 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">אישורים ממתינים</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              {requests.length + hourRecords.length} פריטים ממתינים לאישורך
            </p>
          </div>
        </div>

        {/* Project filter banner */}
        {filterProjectId && (
          <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-primary-light border border-primary/20 rounded-2xl">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <p className="text-sm text-primary flex-1">
              מציג בקשות עבור: <span className="font-bold">{filterProjectName}</span>
            </p>
            <button onClick={clearFilter}
              className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-medium transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              נקה סינון
            </button>
          </div>
        )}

        {/* Tabs — pill style */}
        <div className="flex gap-1.5 bg-gray-100/70 p-1.5 rounded-2xl w-full sm:w-fit mb-7">
          {[
            { id: 'payments', label: 'בקשות תשלום', count: requests.length },
            { id: 'hours', label: 'שעות עוזרי מחקר', count: hourRecords.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 ${
                tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="bg-gray-100 rounded-2xl h-44" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment requests */}
        {!loading && tab === 'payments' && (
          paymentGroups.length === 0
            ? <EmptyState text="אין בקשות תשלום הממתינות לאישורך" />
            : paymentGroups.map((group) => (
              <div key={group.name} className="mb-9">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <h2 className="text-sm font-bold text-gray-800">{group.name}</h2>
                  <span className="badge-yellow">{group.items.length} ממתינות</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map((req) => (
                    <RequestCard key={req.paymentRequestId} request={req}
                      onApprove={handleApprove} onReject={handleReject} />
                  ))}
                </div>
              </div>
            ))
        )}

        {/* Hour approvals */}
        {!loading && tab === 'hours' && (
          hourGroups.length === 0
            ? <EmptyState text={filterProjectId ? 'אין דוחות שעות ממתינים עבור מחקר זה' : 'אין דוחות שעות הממתינים לאישורך'} />
            : hourGroups.map((group) => (
              <div key={group.name} className="mb-9">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 bg-accent rounded-full" />
                  <h2 className="text-sm font-bold text-gray-800">{group.name}</h2>
                  <span className="badge-yellow">{group.items.length} ממתינות</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map((r) => (
                    <HourApprovalCard key={r.monthlyApprovalId} record={r} onDecide={handleHourDecide} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}
    </Layout>
  );
}
