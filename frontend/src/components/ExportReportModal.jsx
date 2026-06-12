import { useState } from 'react';

const SECTION_DEFS = {
  project: [
    { key: 'details',      label: 'פרטי מחקר',       icon: '📋' },
    { key: 'transactions', label: 'ריכוז תנועות',      icon: '💳' },
    { key: 'payments',     label: 'בקשות תשלום',       icon: '🧾' },
    { key: 'team',         label: 'צוות המחקר',        icon: '👥' },
    { key: 'assistants',   label: 'עוזרי מחקר',        icon: '🎓' },
    { key: 'future',       label: 'הוצאות עתידיות',    icon: '📅' },
  ],
  dashboard: [
    { key: 'summary', label: 'סיכום כל המחקרים', icon: '📊' },
  ],
};

export default function ExportReportModal({ type = 'project', onExport, onClose }) {
  const defs = SECTION_DEFS[type];
  const [sections, setSections] = useState(
    Object.fromEntries(defs.map(d => [d.key, true]))
  );

  const toggle    = (key) => setSections(s => ({ ...s, [key]: !s[key] }));
  const allOn     = Object.values(sections).every(Boolean);
  const toggleAll = () => setSections(Object.fromEntries(defs.map(d => [d.key, !allOn])));
  const canExport = Object.values(sections).some(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">ייצוא דוח</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">בחרי מה לכלול:</p>
            <button onClick={toggleAll} className="text-sm text-primary font-semibold hover:underline">
              {allOn ? 'בטל הכל' : 'בחר הכל'}
            </button>
          </div>

          <div className="space-y-2">
            {defs.map(d => (
              <label
                key={d.key}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  sections[d.key]
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={sections[d.key]}
                  onChange={() => toggle(d.key)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-base">{d.icon}</span>
                <span className="text-sm font-medium text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer — Excel + PDF buttons */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => { onExport(sections, 'excel'); onClose(); }}
              disabled={!canExport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth="1.5"/>
                <text x="6" y="18" fontSize="7" fill="white" fontWeight="bold">XLS</text>
              </svg>
              ייצא Excel
            </button>
            <button
              onClick={() => { onExport(sections, 'pdf'); onClose(); }}
              disabled={!canExport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth="1.5"/>
                <text x="6" y="18" fontSize="7" fill="white" fontWeight="bold">PDF</text>
              </svg>
              ייצא PDF
            </button>
          </div>
          <button onClick={onClose}
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
