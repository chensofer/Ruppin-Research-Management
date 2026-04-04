import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProjectDetail,
  getProjectFiles,
  getCommitments,
} from '../api/projectsApi';
import { getPaymentRequestsByProject } from '../api/paymentRequestsApi';
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

  const [detail, setDetail] = useState(null);
  const [payments, setPayments] = useState([]);
  const [files, setFiles] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [detailRes, payRes, filesRes, commRes] = await Promise.all([
        getProjectDetail(id),
        getPaymentRequestsByProject(id).catch(() => ({ data: [] })),
        getProjectFiles(id).catch(() => ({ data: [] })),
        getCommitments(id).catch(() => ({ data: [] })),
      ]);
      setDetail(detailRes.data);
      setPayments(payRes.data);
      setFiles(filesRes.data);
      setCommitments(commRes.data);
    } catch (err) {
      console.error('ProjectPage loadAll error:', err?.response?.status, err?.response?.data, err?.message);
      setError('שגיאה בטעינת נתוני המחקר');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Reload only what changed — keep it granular to avoid full flickers
  const reloadDetail = useCallback(() =>
    getProjectDetail(id).then((r) => setDetail(r.data)).catch(() => {}), [id]);

  const reloadPayments = useCallback(() =>
    getPaymentRequestsByProject(id).then((r) => setPayments(r.data)).catch(() => {}), [id]);

  const reloadFiles = useCallback(() =>
    getProjectFiles(id).then((r) => setFiles(r.data)).catch(() => {}), [id]);

  const reloadCommitments = useCallback(() =>
    getCommitments(id).then((r) => setCommitments(r.data)).catch(() => {}), [id]);

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
          <StatusBadge status={detail.status} />
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
        <TabOverview detail={detail} />
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
        <TabTransactions payments={payments} totalBudget={budget} />
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
