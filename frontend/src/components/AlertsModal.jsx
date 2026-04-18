import { useNavigate } from 'react-router-dom';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

export default function AlertsModal({ budgetAlerts, timeAlerts, onClose }) {
  const navigate = useNavigate();
  const total = budgetAlerts.length + timeAlerts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-orange-500 to-red-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="סגור"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2.5 mb-1">
                <h2 className="text-lg font-bold">התראות מחקר</h2>
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-white/80">
                נמצאו {total} {total === 1 ? 'התראה' : 'התראות'} הדורשות תשומת לב
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* Budget alerts */}
          {budgetAlerts.length > 0 && (
            <section>
              <div className="flex items-center justify-end gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700">התראות תקציב</h3>
                <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {budgetAlerts.map((a) => (
                  <div
                    key={a.projectId}
                    className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3 gap-3"
                  >
                    <button
                      onClick={() => { navigate(`/projects/${a.projectId}`); onClose(); }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap transition-colors"
                    >
                      כניסה למחקר ←
                    </button>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        נותרו {fmt(a.available)} מתוך {fmt(a.budget)}
                        <span className="font-bold mr-1">({a.pct}% יתרה)</span>
                      </p>
                    </div>
                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Time alerts */}
          {timeAlerts.length > 0 && (
            <section>
              <div className="flex items-center justify-end gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700">התראות זמן</h3>
                <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {timeAlerts.map((a) => (
                  <div
                    key={a.projectId}
                    className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 gap-3"
                  >
                    <button
                      onClick={() => { navigate(`/projects/${a.projectId}`); onClose(); }}
                      className="text-xs text-orange-600 hover:text-orange-800 font-medium whitespace-nowrap transition-colors"
                    >
                      כניסה למחקר ←
                    </button>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        המחקר מסתיים ב־{a.endDate}
                        <span className="font-bold mr-1">({a.daysLeft} ימים נותרו)</span>
                      </p>
                      <div className="mt-1.5 w-full bg-orange-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 rounded-full h-1.5 transition-all"
                          style={{ width: `${a.elapsedPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-orange-400 mt-0.5 text-left">{a.elapsedPct}% מהתקופה חלף</p>
                    </div>
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400"></p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            הבנתי
          </button>
        </div>
      </div>
    </div>
  );
}
