import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBell, HiXMark, HiExclamationTriangle, HiClock, HiArrowRight, HiArrowsRightLeft, HiArrowTopRightOnSquare, HiCheckCircle } from 'react-icons/hi2';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

const APPROVAL_TYPES = ['payment_approved', 'payment_rejected', 'hour_approved', 'hour_rejected'];

export default function AlertsModal({ budgetAlerts, timeAlerts, transferRequests, onDeleteNotif, onClose }) {
  const navigate = useNavigate();
  budgetAlerts = Array.isArray(budgetAlerts) ? budgetAlerts : [];
  timeAlerts = Array.isArray(timeAlerts) ? timeAlerts : [];
  transferRequests = Array.isArray(transferRequests) ? transferRequests : [];

  const budgetTransfers = transferRequests.filter(n => !APPROVAL_TYPES.includes(n.notificationType));
  const approvedNotifs  = transferRequests.filter(n => n.notificationType === 'payment_approved' || n.notificationType === 'hour_approved');
  const rejectedNotifs  = transferRequests.filter(n => n.notificationType === 'payment_rejected' || n.notificationType === 'hour_rejected');

  const total = budgetAlerts.length + timeAlerts.length + transferRequests.length;

  return (
    <Transition show={true} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50" dir="rtl">

        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-l from-orange-500 to-red-500 px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <HiBell className="w-4 h-4" />
                      </div>
                      <DialogTitle className="text-base font-bold">התראות מחקר</DialogTitle>
                    </div>
                    <p className="text-sm text-white/80 pr-10">
                      נמצאו {total} {total === 1 ? 'התראה' : 'התראות'} הדורשות תשומת לב
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">

                {/* Approved requests */}
                {approvedNotifs.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiCheckCircle className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">בקשות שאושרו</h3>
                    </div>
                    <div className="space-y-2">
                      {approvedNotifs.map((n) => {
                        const dateStr = n.createdAt && !n.createdAt.endsWith('Z') ? n.createdAt + 'Z' : n.createdAt;
                        return (
                          <div key={n.notificationId} className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 border-r-[3px] border-r-green-400">
                            <p className="text-sm font-semibold text-green-700 mb-1 flex items-center gap-1.5">
                              <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                              {n.notificationType === 'hour_approved' ? 'דוח שעות אושר' : 'בקשת תשלום אושרה'}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {new Date(dateStr).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {onDeleteNotif && (
                                <button onClick={() => onDeleteNotif(n.notificationId)} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">סגור</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Rejected requests */}
                {rejectedNotifs.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiXMark className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">בקשות שנדחו</h3>
                    </div>
                    <div className="space-y-2">
                      {rejectedNotifs.map((n) => {
                        const dateStr = n.createdAt && !n.createdAt.endsWith('Z') ? n.createdAt + 'Z' : n.createdAt;
                        return (
                          <div key={n.notificationId} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 border-r-[3px] border-r-red-400">
                            <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-1.5">
                              <HiXMark className="w-4 h-4 flex-shrink-0" />
                              {n.notificationType === 'hour_rejected' ? 'דוח שעות נדחה' : 'בקשת תשלום נדחתה'}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {new Date(dateStr).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {onDeleteNotif && (
                                <button onClick={() => onDeleteNotif(n.notificationId)} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">סגור</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Budget alerts */}
                {budgetAlerts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiExclamationTriangle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">התראות תקציב</h3>
                    </div>
                    <div className="space-y-2">
                      {budgetAlerts.map((a) => (
                        <div
                          key={a.projectId}
                          className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 border-r-[3px] border-r-red-400"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate flex-1">{a.name}</p>
                            <button
                              onClick={() => { navigate(`/projects/${a.projectId}`); onClose(); }}
                              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                            >
                              כניסה
                              <HiArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm text-red-500 mt-1">
                            נותרו <span className="font-bold text-red-700">{fmt(a.available)}</span> מתוך {fmt(a.budget)}
                            <span className="font-bold text-red-700 mr-1.5">· {a.pct}% יתרה</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Time alerts */}
                {timeAlerts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiClock className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">התראות זמן</h3>
                    </div>
                    <div className="space-y-2">
                      {timeAlerts.map((a) => (
                        <div
                          key={a.projectId}
                          className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 border-r-[3px] border-r-orange-400"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate flex-1">{a.name}</p>
                            <button
                              onClick={() => { navigate(`/projects/${a.projectId}`); onClose(); }}
                              className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800 font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                            >
                              כניסה
                              <HiArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm text-orange-500 mt-1">
                            מסתיים ב־{a.endDate}
                            <span className="font-bold text-orange-700 mr-1.5">· {a.daysLeft} ימים נותרו</span>
                          </p>
                          <div className="mt-2 w-full bg-orange-200 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 rounded-full h-1.5 transition-all"
                              style={{ width: `${a.elapsedPct}%` }}
                            />
                          </div>
                          <p className="text-sm text-orange-400 mt-1">{a.elapsedPct}% מהתקופה חלף</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Budget transfer alerts */}
                {budgetTransfers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiArrowsRightLeft className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">בקשות להעברת תקציב</h3>
                    </div>
                    <div className="space-y-2">
                      {budgetTransfers.map((n) => {
                        let parsed = null;
                        try { parsed = JSON.parse(n.data); } catch {}
                        const dateStr = n.createdAt && !n.createdAt.endsWith('Z') ? n.createdAt + 'Z' : n.createdAt;
                        return (
                          <div key={n.notificationId} className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 border-r-[3px] border-r-purple-400">
                            <p className="text-sm font-semibold text-purple-700 mb-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              בקשת העברת תקציב
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                            {parsed && (
                              <button
                                onClick={() => { navigate(`/projects/${parsed.giverProjectId}?tab=transfer&to=${parsed.receiverProjectId}&amount=${Math.round(parsed.amount)}`); onClose(); }}
                                className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                              >
                                <HiArrowTopRightOnSquare className="w-4 h-4" />
                                עבור לביצוע ההעברה
                              </button>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {new Date(dateStr).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {onDeleteNotif && (
                                <button onClick={() => onDeleteNotif(n.notificationId)} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">סגור</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-start">
                <button
                  onClick={() => {
                    if (onDeleteNotif) {
                      [...approvedNotifs, ...rejectedNotifs].forEach(n => onDeleteNotif(n.notificationId));
                    }
                    onClose();
                  }}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  הבנתי
                </button>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
