import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPendingPaymentRequests, updatePaymentRequestStatus } from '../api/paymentRequestsApi';
import { getPendingHourApprovals, decideMonthlyApproval } from '../api/hourReportsApi';
import Layout from '../components/Layout';

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
  return Number(amount).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
}

function RequestCard({ request, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleApprove = async () => {
    setBusy(true);
    await onApprove(request.paymentRequestId);
    setBusy(false);
  };

  const handleRejectConfirm = async () => {
    setBusy(true);
    await onReject(request.paymentRequestId, reason);
    setBusy(false);
  };

  const quotationFiles = request.quotationFilePath
    ? request.quotationFilePath.split(';').filter(Boolean)
    : [];
  const hasDetails = request.providerName || request.requestDescription || quotationFiles.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {request.requestTitle || 'בקשה ללא כותרת'}
            </h4>
            {request.categoryName && (
              <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {request.categoryName}
              </span>
            )}
          </div>
          <div className="text-left flex-shrink-0">
            <p className="text-lg font-bold text-gray-900">{formatAmount(request.requestedAmount)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
          {(request.requestedByUserName || request.requestedByUserId) && (
            <span>מבקש: <span className="font-medium text-gray-700">{request.requestedByUserName || request.requestedByUserId}</span></span>
          )}
          {request.requestDate && (
            <span>תאריך: <span className="font-medium text-gray-700">{formatDate(request.requestDate)}</span></span>
          )}
        </div>

        {hasDetails && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'הסתר פרטים' : 'פרטים נוספים'}
          </button>
        )}

        {expanded && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2 text-xs">
            {request.providerName && (
              <div>
                <dt className="text-gray-400 mb-0.5">ספק</dt>
                <dd className="text-gray-700 font-medium">{request.providerName}</dd>
              </div>
            )}
            {request.requestDescription && (
              <div>
                <dt className="text-gray-400 mb-0.5">תיאור</dt>
                <dd className="text-gray-700">{request.requestDescription}</dd>
              </div>
            )}
            {quotationFiles.length > 0 && (
              <div>
                <dt className="text-gray-400 mb-1">קבצים מצורפים</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {quotationFiles.map((path, i) => {
                    const name = path.split('/').pop();
                    return (
                      <a
                        key={i}
                        href={`http://localhost:5269${path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        )}

        {rejecting ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="סיבת הדחייה (אופציונלי)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectConfirm}
                disabled={busy}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {busy ? 'שולח...' : 'אישור דחייה'}
              </button>
              <button
                onClick={() => { setRejecting(false); setReason(''); }}
                disabled={busy}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {busy ? 'מאשר...' : 'אישור'}
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-sm font-medium py-2 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              דחייה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HourApprovalCard({ record, onDecide }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [budgetError, setBudgetError] = useState('');

  const fmtCurrency = (n) => n != null
    ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : null;

  const decide = async (status) => {
    setBusy(true);
    setBudgetError('');
    const err = await onDecide(record.monthlyApprovalId, status, status === 'נדחה' ? reason : null);
    if (err) setBudgetError(err);
    setBusy(false);
  };

  const paymentAmount = record.totalPaymentAmount;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {record.userName || record.userId}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {record.projectNameHe || `מחקר ${record.projectId}`} · {MONTH_NAMES[record.month]} {record.year}
          </p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">{record.totalWorkedHours ?? '—'}</p>
          <p className="text-xs text-gray-400">שעות</p>
          {paymentAmount != null && (
            <p className="text-sm font-bold text-primary mt-0.5">{fmtCurrency(paymentAmount)}</p>
          )}
          {record.salaryPerHour != null && (
            <p className="text-xs text-gray-400">{fmtCurrency(record.salaryPerHour)}/שעה</p>
          )}
        </div>
      </div>

      {budgetError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
          {budgetError}
        </div>
      )}

      {record.comments && (
        <p className="text-xs text-gray-500 mb-3">{record.comments}</p>
      )}

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="סיבת הדחייה (אופציונלי)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-2">
            <button onClick={() => decide('נדחה')} disabled={busy}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              {busy ? 'שולח...' : 'אישור דחייה'}
            </button>
            <button onClick={() => { setRejecting(false); setReason(''); }} disabled={busy}
              className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors">
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => decide('אושר')} disabled={busy}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {busy ? 'מאשר...' : 'אישור'}
          </button>
          <button onClick={() => setRejecting(true)} disabled={busy}
            className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-sm font-medium py-2 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            דחייה
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('payments');
  const [requests, setRequests] = useState([]);
  const [hourRecords, setHourRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

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
    } catch {
      setError('שגיאה בטעינת הבקשות');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await updatePaymentRequestStatus(id, {
        status: 'אושר',
        approvedByUserId: user?.userId,
      });
      setRequests((prev) => prev.filter((r) => r.paymentRequestId !== id));
      showToast('הבקשה אושרה בהצלחה');
    } catch {
      showToast('שגיאה באישור הבקשה');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await updatePaymentRequestStatus(id, {
        status: 'נדחה',
        approvedByUserId: user?.userId,
        rejectionReason: reason || null,
      });
      setRequests((prev) => prev.filter((r) => r.paymentRequestId !== id));
      showToast('הבקשה נדחתה');
    } catch {
      showToast('שגיאה בדחיית הבקשה');
    }
  };

  const handleHourDecide = async (id, status, comments) => {
    try {
      await decideMonthlyApproval(id, {
        approvalStatus: status,
        approvedByUserId: user?.userId,
        comments: comments || null,
      });
      setHourRecords((prev) => prev.filter((r) => r.monthlyApprovalId !== id));
      showToast(status === 'אושר' ? 'שעות אושרו' : 'שעות נדחו');
      return null;
    } catch (err) {
      const msg = err.response?.data?.message || 'שגיאה בעדכון';
      if (err.response?.status === 400) return msg; // return budget error to card
      showToast(msg);
      return null;
    }
  };

  // Group requests by project
  const grouped = requests.reduce((acc, req) => {
    const key = req.projectId ?? 0;
    const name = req.projectNameHe || req.projectNameEn || `מחקר ${key}`;
    if (!acc[key]) acc[key] = { name, items: [] };
    acc[key].items.push(req);
    return acc;
  }, {});

  const groups = Object.values(grouped);
  const totalCount = requests.length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">אישורים ממתינים</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <button
            onClick={() => setTab('payments')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            בקשות תשלום
            {requests.length > 0 && (
              <span className="mr-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('hours')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'hours' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            שעות עוזרי מחקר
            {hourRecords.length > 0 && (
              <span className="mr-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {hourRecords.length}
              </span>
            )}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="bg-gray-100 rounded-xl h-40" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment requests tab */}
        {!loading && tab === 'payments' && (
          <>
            {totalCount === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">הכל מעודכן!</p>
                <p className="text-sm mt-1">אין בקשות תשלום הממתינות לאישורך</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.name} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-primary rounded-full" />
                      <h2 className="text-base font-semibold text-gray-800">{group.name}</h2>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {group.items.length} ממתינות
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.items.map((req) => (
                      <RequestCard
                        key={req.paymentRequestId}
                        request={req}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Hour approvals tab */}
        {!loading && tab === 'hours' && (
          <>
            {hourRecords.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">הכל מעודכן!</p>
                <p className="text-sm mt-1">אין דוחות שעות הממתינים לאישורך</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hourRecords.map((r) => (
                  <HourApprovalCard
                    key={r.monthlyApprovalId}
                    record={r}
                    onDecide={handleHourDecide}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition-all">
          {toastMsg}
        </div>
      )}
    </Layout>
  );
}
