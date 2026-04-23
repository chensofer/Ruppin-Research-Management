import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBell, HiXMark, HiExclamationTriangle, HiClock, HiArrowRight } from 'react-icons/hi2';

const fmt = (n) =>
  `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}`;

export default function AlertsModal({ budgetAlerts, timeAlerts, onClose }) {
  const navigate = useNavigate();
  const total = budgetAlerts.length + timeAlerts.length;

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

                {/* Budget alerts */}
                {budgetAlerts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HiExclamationTriangle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">התראות תקציב</h3>
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
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                            >
                              כניסה
                              <HiArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-red-500 mt-1">
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
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">התראות זמן</h3>
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
                              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                            >
                              כניסה
                              <HiArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-orange-500 mt-1">
                            מסתיים ב־{a.endDate}
                            <span className="font-bold text-orange-700 mr-1.5">· {a.daysLeft} ימים נותרו</span>
                          </p>
                          <div className="mt-2 w-full bg-orange-200 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 rounded-full h-1.5 transition-all"
                              style={{ width: `${a.elapsedPct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-orange-400 mt-1">{a.elapsedPct}% מהתקופה חלף</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-start">
                <button
                  onClick={onClose}
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
