import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiBell, HiXMark, HiExclamationTriangle, HiClock, HiArrowLeft,
} from 'react-icons/hi2';

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
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2.5 mb-1">
                      <DialogTitle className="text-lg font-bold">התראות מחקר</DialogTitle>
                      <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                        <HiBell className="w-5 h-5" />
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
                        <HiExclamationTriangle className="w-4 h-4 text-red-600" />
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
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                          >
                            כניסה למחקר <HiArrowLeft className="w-3 h-3" />
                          </button>
                          <div className="text-right flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                            <p className="text-xs text-red-600 mt-0.5">
                              נותרו {fmt(a.available)} מתוך {fmt(a.budget)}
                              <span className="font-bold mr-1">({a.pct}% יתרה)</span>
                            </p>
                          </div>
                          <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <HiExclamationTriangle className="w-4 h-4 text-red-500" />
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
                        <HiClock className="w-4 h-4 text-orange-600" />
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
                            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium transition-colors"
                          >
                            כניסה למחקר <HiArrowLeft className="w-3 h-3" />
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
                            <HiClock className="w-4 h-4 text-orange-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
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
