import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  getProjectDetail,
  getProjectFiles,
  getCommitments,
  deleteProject,
} from '../api/projectsApi';
import { getPaymentRequestsByProject } from '../api/paymentRequestsApi';
import { getPendingHourApprovals } from '../api/hourReportsApi';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import TabOverview from '../components/ProjectPage/TabOverview';
import TabPayments from '../components/ProjectPage/TabPayments';
import TabTeam from '../components/ProjectPage/TabTeam';
import TabAssistants from '../components/ProjectPage/TabAssistants';
import TabTransactions from '../components/ProjectPage/TabTransactions';
import TabDocuments from '../components/ProjectPage/TabDocuments';
import TabFutureExpenses from '../components/ProjectPage/TabFutureExpenses';

const TABS = [
  { id: 'overview',     label: 'סקירה כללית' },
  { id: 'transactions', label: 'ריכוז תנועות' },
  { id: 'payments',     label: 'בקשות תשלום' },
  { id: 'team',         label: 'צוות המחקר' },
  { id: 'assistants',   label: 'עוזרי מחקר' },
  { id: 'documents',    label: 'מסמכים' },
  { id: 'future',       label: 'הוצאות עתידיות' },
];

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

function StatCard({ label, value, color = 'text-gray-900', sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'פעיל' || status === 'Active' || status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {isActive && (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {isActive ? 'פעיל' : (status || 'לא ידוע')}
    </span>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [payments, setPayments] = useState([]);
  const [files, setFiles] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [pendingHourApprovals, setPendingHourApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const popupShownRef = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const projectIdInt = parseInt(id, 10);
      const [detailRes, payRes, filesRes, commRes, hourRes] = await Promise.all([
        getProjectDetail(id),
        getPaymentRequestsByProject(id).catch(() => ({ data: [] })),
        getProjectFiles(id).catch(() => ({ data: [] })),
        getCommitments(id).catch(() => ({ data: [] })),
        user?.userId
          ? getPendingHourApprovals(user.userId).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setDetail(detailRes.data);
      setPayments(payRes.data);
      setFiles(filesRes.data);
      setCommitments(commRes.data);
      // Keep only the pending hour approvals that belong to this specific project
      setPendingHourApprovals(
        (hourRes.data ?? []).filter((a) => a.projectId === projectIdInt)
      );
    } catch (err) {
      console.error('ProjectPage loadAll error:', err?.response?.status, err?.response?.data, err?.message);
      setError('שגיאה בטעינת נתוני המחקר');
    } finally {
      setLoading(false);
    }
  }, [id, user?.userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Show the pending-requests popup once per page visit, after initial load
  useEffect(() => {
    if (!loading && !popupShownRef.current) {
      popupShownRef.current = true;
      const payCount  = payments.filter((p) => p.status === 'ממתין').length;
      const hourCount = pendingHourApprovals.length;
      if (payCount + hourCount > 0) setShowPendingPopup(true);
    }
  }, [loading, payments, pendingHourApprovals]);

  // Reload only what changed — keep it granular to avoid full flickers
  const reloadDetail = useCallback(() =>
    getProjectDetail(id).then((r) => setDetail(r.data)).catch(() => {}), [id]);

  const reloadPayments = useCallback(() =>
    getPaymentRequestsByProject(id).then((r) => setPayments(r.data)).catch(() => {}), [id]);

  const reloadFiles = useCallback(() =>
    getProjectFiles(id).then((r) => setFiles(r.data)).catch(() => {}), [id]);

  const reloadCommitments = useCallback(() =>
    getCommitments(id).then((r) => setCommitments(r.data)).catch(() => {}), [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(id);
      toast.success('המחקר נמחק בהצלחה');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'שגיאה במחיקת המחקר';
      toast.error(msg);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !detail) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error || 'המחקר לא נמצא'}
        </div>
      </Layout>
    );
  }

  const budget = detail.totalBudget || 0;
  const totalPaid = detail.totalPaid || 0;
  const totalFuture = detail.totalFuture || 0;
  const remaining = detail.remainingBalance ?? budget - totalPaid;
  const available = detail.availableBalance ?? remaining - totalFuture;
  const usagePercent = budget > 0 ? Math.min(Math.round((totalPaid / budget) * 100), 100) : 0;

  return (
    <Layout>
      {/* Back + header */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          חזרה לרשימה
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={detail.status} />
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              מחק מחקר
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">
              {detail.projectNameHe || detail.projectNameEn || `מחקר #${detail.projectId}`}
            </h1>
            {detail.projectNameEn && detail.projectNameHe && (
              <p className="text-sm text-gray-400 mt-0.5">{detail.projectNameEn}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-right">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">מחיקת מחקר</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              האם אתה בטוח שברצונך למחוק את המחקר:
            </p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-5">
              "{detail.projectNameHe}"?
            </p>
            <p className="text-xs text-red-500 text-center mb-5">
              פעולה זו בלתי הפיכה. כל נתוני המחקר יימחקו לצמיתות.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending approvals popup */}
      {showPendingPopup && (() => {
        const payCount  = payments.filter((p) => p.status === 'ממתין').length;
        const hourCount = pendingHourApprovals.length;
        const total     = payCount + hourCount;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-right">
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 mx-auto mb-4">
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                ממתין לאישורך
              </h3>
              <p className="text-3xl font-extrabold text-yellow-600 text-center mb-4">{total}</p>

              {/* Breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
                {payCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">{payCount}</span>
                    <span className="text-gray-500 flex items-center gap-1.5">
                      בקשות תשלום
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 14l-4-4m0 0l4-4m-4 4h12a4 4 0 010 8H5" />
                      </svg>
                    </span>
                  </div>
                )}
                {hourCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">{hourCount}</span>
                    <span className="text-gray-500 flex items-center gap-1.5">
                      דוחות שעות
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowPendingPopup(false);
                    navigate(`/approvals?projectId=${id}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  עבור לדף האישורים
                </button>
                <button
                  onClick={() => setShowPendingPopup(false)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  המשך לדף המחקר
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Budget summary — 5 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="תקציב כולל" value={fmt(budget)} />
        <StatCard label="יתרה (לאחר תשלומים)" value={fmt(remaining)}
          color={remaining < 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="סה״כ הוצאות בפועל" value={fmt(totalPaid)} color="text-primary" />
        <StatCard label="התחייבויות עתידיות" value={fmt(totalFuture)} color="text-orange-500"
          sub={`${commitments.length} רשומות`} />
        <StatCard label="יתרה זמינה" value={fmt(available)}
          color={available < 0 ? 'text-red-600' : 'text-emerald-600'}
          sub="לאחר ניכוי עתידיות" />
      </div>

      {/* Budget pie chart */}
      {budget > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 text-right">התפלגות תקציב</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'הוצאות בפועל', value: totalPaid },
                  { name: 'התחייבויות עתידיות', value: totalFuture },
                  { name: 'יתרה זמינה', value: Math.max(0, available) },
                ].filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={2}
              >
                <Cell fill="#6366f1" />
                <Cell fill="#f97316" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip formatter={(v) => `₪${new Intl.NumberFormat('he-IL').format(v)}`} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{fmt(totalPaid)} הוצא</span>
          <span>{usagePercent}% ניצול מתוך {fmt(budget)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${usagePercent}%` }} />
        </div>
        {totalFuture > 0 && (
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span className="text-orange-500">{fmt(totalFuture)} התחייבויות עתידיות</span>
            <span className="text-emerald-600">{fmt(available)} זמין</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <TabOverview detail={detail} onChanged={reloadDetail} />
      )}
      {activeTab === 'payments' && (
        <TabPayments
          projectId={id}
          payments={payments}
          onCreated={() => { reloadPayments(); reloadDetail(); }}
        />
      )}
      {activeTab === 'team' && (
        <TabTeam
          projectId={id}
          teamMembers={detail.teamMembers}
          principalResearcherId={detail.principalResearcherId?.trim()}
          principalResearcherName={detail.principalResearcherName}
          onChanged={reloadDetail}
        />
      )}
      {activeTab === 'assistants' && (
        <TabAssistants
          projectId={id}
          assistants={detail.assistants}
          onChanged={reloadDetail}
        />
      )}
      {activeTab === 'transactions' && (
        <TabTransactions
          payments={payments}
          totalBudget={budget}
          projectName={detail.projectNameHe || detail.projectNameEn}
        />
      )}
      {activeTab === 'documents' && (
        <TabDocuments
          projectId={id}
          files={files}
          onChanged={reloadFiles}
        />
      )}
      {activeTab === 'future' && (
        <TabFutureExpenses
          projectId={id}
          commitments={commitments}
          availableBalance={available}
          onChanged={() => { reloadCommitments(); reloadDetail(); }}
        />
      )}
    </Layout>
  );
}
