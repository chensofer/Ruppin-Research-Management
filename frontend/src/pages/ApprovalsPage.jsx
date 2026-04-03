import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPendingPaymentRequests, updatePaymentRequestStatus } from '../api/paymentRequestsApi';
import Layout from '../components/Layout';

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
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

      {request.requestDescription && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{request.requestDescription}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
        {request.requestedByUserId && (
          <span>מבקש: <span className="font-medium text-gray-700">{request.requestedByUserId}</span></span>
        )}
        {request.requestDate && (
          <span>תאריך: <span className="font-medium text-gray-700">{formatDate(request.requestDate)}</span></span>
        )}
        {request.dueDate && (
          <span>לביצוע עד: <span className="font-medium text-gray-700">{formatDate(request.dueDate)}</span></span>
        )}
      </div>

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
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
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
      const res = await getPendingPaymentRequests();
      setRequests(res.data);
    } catch {
      setError('שגיאה בטעינת הבקשות');
    } finally {
      setLoading(false);
    }
  }, []);

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">אישור בקשות תשלום</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'טוען...' : totalCount > 0
              ? `${totalCount} בקשות ממתינות לאישור`
              : 'אין בקשות ממתינות כרגע'}
          </p>
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

        {/* Empty state */}
        {!loading && totalCount === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">הכל מעודכן!</p>
            <p className="text-sm mt-1">אין בקשות תשלום הממתינות לאישורך</p>
          </div>
        )}

        {/* Grouped requests */}
        {!loading && groups.map((group) => (
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
        ))}
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
