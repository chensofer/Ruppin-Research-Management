const STEPS = [
  { id: 'details',    label: 'פרטי מחקר', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  )},
  { id: 'budget',     label: 'תקציב', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  )},
  { id: 'team',       label: 'צוות', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  )},
  { id: 'assistants', label: 'עוזרי מחקר', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  )},
  { id: 'expenses',   label: 'הוצאות', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  )},
  { id: 'documents',  label: 'מסמכים', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  )},
  { id: 'summary',    label: 'סיכום', icon: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  )},
];

export const STEP_IDS = STEPS.map((s) => s.id);

export default function Stepper({ currentStep }) {
  const currentIndex = STEP_IDS.indexOf(currentStep);

  return (
    <div dir="rtl" className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive    = idx === currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isCompleted ? 'bg-green-500' :
                isActive    ? 'bg-primary'   : 'bg-gray-100 border border-gray-200'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {step.icon}
                  </svg>
                )}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isCompleted ? 'text-green-600' :
                isActive    ? 'text-primary'   : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                idx < currentIndex ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
