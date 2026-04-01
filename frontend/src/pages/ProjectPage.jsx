import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject } from '../api/projectsApi';
import { getPaymentRequestsByProject } from '../api/paymentRequestsApi';
import Layout from '../components/Layout';

const TABS = [
  { id: 'overview', label: 'סקירה כללית' },
  { id: 'payments', label: 'בקשות תשלום' },
  { id: 'team', label: 'צוות המחקר' },
];

function StatusBadge({ status }) {
  const isActive = status === 'פעיל' || status === 'Active' || status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
      isActive ? 'bg-success-light text-success' : 'bg-gray-100 text-gray-600'
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

function PaymentStatusBadge({ status }) {
  const styles = {
    'אושר': 'bg-success-light text-success',
    'נדחה': 'bg-red-100 text-red-700',
    'ממתין': 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'ממתין'}
    </span>
  );
}

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (n) =>
    n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  };

  useEffect(() => {
    Promise.all([
      getProject(id),
      getPaymentRequestsByProject(id),
    ])
      .then(([projRes, payRes]) => {
        setProject(projRes.data);
        setPayments(payRes.data);
      })
      .catch(() => setError('שגיאה בטעינת נתוני המחקר'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error || 'המחקר לא נמצא'}
        </div>
      </Layout>
    );
  }

  const budget = project.totalBudget || 0;
  const expenses = project.researchExpenses || 0;
  const remaining = budget - expenses;
  const usagePercent = budget > 0 ? Math.min(Math.round((expenses / budget) * 100), 100) : 0;

  const pendingPayments = payments.filter((p) => p.status === 'ממתין');
  const approvedTotal = payments
    .filter((p) => p.status === 'אושר')
    .reduce((sum, p) => sum + (p.requestedAmount || 0), 0);

  return (
    <Layout>
      {/* Back button + header */}
      <div className="mb-6">
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
          <StatusBadge status={project.status} />
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">
              {project.projectNameHe || project.projectNameEn || `מחקר #${project.projectId}`}
            </h1>
            {project.projectNameEn && project.projectNameHe && (
              <p className="text-sm text-gray-400 mt-0.5">{project.projectNameEn}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="תקציב כולל" value={formatCurrency(budget)} />
        <StatCard label="יתרה" value={formatCurrency(remaining)} color="text-success" />
        <StatCard label="הוצאות" value={formatCurrency(expenses)} color="text-primary" />
        <StatCard
          label="ניצול תקציב"
          value={`${usagePercent}%`}
          sub={`${payments.length} בקשות תשלום`}
        />
      </div>

      {/* Budget progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{usagePercent}% נוצל</span>
          <span>ניצול תקציב</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-primary rounded-full h-2.5 transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatCurrency(expenses)} הוצא</span>
          <span>{formatCurrency(budget)} סה״כ</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {project.projectDescription && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">תיאור המחקר</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{project.projectDescription}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">פרטים כלליים</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400">חוקר ראשי</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.principalResearcherId || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">מזהה מחקר</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.projectId}</dd>
              </div>
              <div>
                <dt className="text-gray-400">תאריך התחלה</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{formatDate(project.startDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">תאריך סיום</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{formatDate(project.endDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">בקשות ממתינות</dt>
                <dd className="font-medium text-yellow-600 mt-0.5">{pendingPayments.length}</dd>
              </div>
              <div>
                <dt className="text-gray-400">סה״כ אושר לתשלום</dt>
                <dd className="font-medium text-success mt-0.5">{formatCurrency(approvedTotal)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Tab: Payment Requests */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              בקשה חדשה
            </button>
            <h2 className="text-sm font-semibold text-gray-700">
              בקשות תשלום ({payments.length})
            </h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">אין בקשות תשלום עדיין</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-right font-medium">כותרת</th>
                    <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                    <th className="px-5 py-3 text-right font-medium">סכום</th>
                    <th className="px-5 py-3 text-right font-medium">תאריך</th>
                    <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.paymentRequestId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {p.requestTitle || `בקשה #${p.paymentRequestId}`}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{p.categoryName || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {formatCurrency(p.requestedAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{formatDate(p.requestDate)}</td>
                      <td className="px-5 py-3.5">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Team */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span />
            <h2 className="text-sm font-semibold text-gray-700">חברי הצוות</h2>
          </div>
          {project.principalResearcherId ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {project.principalResearcherId[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{project.principalResearcherId}</p>
                <p className="text-xs text-gray-400">חוקר ראשי</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">לא הוגדרו חברי צוות</p>
          )}
        </div>
      )}
    </Layout>
  );
}
