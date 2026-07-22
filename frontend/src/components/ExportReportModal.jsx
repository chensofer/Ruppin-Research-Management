import { useState, useMemo } from 'react';

const TODAY = new Date().toISOString().split('T')[0];
function isProjectActive(p) {
  const s = p.status === 'פעיל' || p.status === 'Active' || p.status === 'active';
  if (!s) return false;
  if (p.endDate && String(p.endDate).slice(0, 10) < TODAY) return false;
  return true;
}

const SECTION_DEFS = {
  project: [
    { key: 'details',      label: 'פרטי מחקר',          icon: '📋' },
    { key: 'transactions', label: 'ריכוז תנועות',         icon: '💳' },
    { key: 'payments',     label: 'בקשות תשלום',          icon: '🧾' },
    { key: 'team',         label: 'צוות המחקר',           icon: '👥' },
    { key: 'assistants',   label: 'עוזרי מחקר',           icon: '🎓' },
    { key: 'documents',    label: 'מסמכים',               icon: '📁' },
    { key: 'future',       label: 'הוצאות עתידיות',       icon: '📅' },
    { key: 'history',      label: 'היסטוריית שינויים',    icon: '🕐' },
  ],
  dashboard: [
    { key: 'summary', label: 'טבלת סיכום', icon: '📊' },
  ],
};

const SCOPE_OPTIONS = [
  { value: 'all',      label: 'כל המחקרים' },
  { value: 'active',   label: 'מחקרים פעילים' },
  { value: 'inactive', label: 'מחקרים לא פעילים' },
  { value: 'specific', label: 'מחקרים ספציפיים' },
];

export default function ExportReportModal({ type = 'project', projects = [], onExport, onClose }) {
  const defs = SECTION_DEFS[type];
  const [sections, setSections] = useState(Object.fromEntries(defs.map(d => [d.key, true])));

  // Dashboard-only state
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggle    = (key) => setSections(s => ({ ...s, [key]: !s[key] }));
  const allOn     = Object.values(sections).every(Boolean);
  const toggleAll = () => setSections(Object.fromEntries(defs.map(d => [d.key, !allOn])));
  const canExport = Object.values(sections).some(Boolean);

  const filteredForPicker = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p =>
      !q ||
      p.projectNameHe?.toLowerCase().includes(q) ||
      p.projectNameEn?.toLowerCase().includes(q) ||
      p.principalResearcherId?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const activeCount   = projects.filter(isProjectActive).length;
  const inactiveCount = projects.length - activeCount;

  const scopeLabels = {
    all:      `כל המחקרים (${projects.length})`,
    active:   `מחקרים פעילים (${activeCount})`,
    inactive: `מחקרים לא פעילים (${inactiveCount})`,
    specific: 'מחקרים ספציפיים',
  };

  const toggleProject = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPickerSelected = filteredForPicker.length > 0 && filteredForPicker.every(p => selectedIds.has(p.projectId));
  const toggleAllPicker = () => {
    if (allPickerSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredForPicker.forEach(p => next.delete(p.projectId));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredForPicker.forEach(p => next.add(p.projectId));
        return next;
      });
    }
  };

  const projectsToExport = useMemo(() => {
    if (type !== 'dashboard') return projects;
    if (scope === 'active')   return projects.filter(isProjectActive);
    if (scope === 'inactive') return projects.filter(p => !isProjectActive(p));
    if (scope === 'specific') return projects.filter(p => selectedIds.has(p.projectId));
    return projects;
  }, [type, scope, projects, selectedIds]);

  const canExportDashboard = type !== 'dashboard' || scope !== 'specific' || selectedIds.size > 0;

  const handleExport = (format) => {
    if (type === 'dashboard') onExport(sections, format, projectsToExport);
    else onExport(sections, format);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {type === 'dashboard' ? 'ייצוא דוח מחקרים' : 'ייצוא דוח'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Dashboard: scope selector */}
          {type === 'dashboard' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">בחרי מחקרים לייצוא:</p>
              <div className="space-y-1.5">
                {Object.entries(scopeLabels).map(([val, label]) => (
                  <label
                    key={val}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border ${
                      scope === val ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={val}
                      checked={scope === val}
                      onChange={() => { setScope(val); if (val !== 'specific') setSearch(''); }}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {/* Project picker */}
              {scope === 'specific' && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="חיפוש מחקר לפי שם או חוקר..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs text-gray-400">{selectedIds.size} נבחרו</span>
                    <button onClick={toggleAllPicker} className="text-xs text-primary font-semibold hover:underline">
                      {allPickerSelected ? 'בטל הכל' : 'בחר הכל'}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                    {filteredForPicker.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-5">לא נמצאו מחקרים</p>
                    ) : (
                      filteredForPicker.map(p => (
                        <label
                          key={p.projectId}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            selectedIds.has(p.projectId) ? 'bg-primary/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.projectId)}
                            onChange={() => toggleProject(p.projectId)}
                            className="w-4 h-4 accent-primary flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 truncate">
                            {p.projectNameHe || p.projectNameEn || `מחקר ${p.projectId}`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sections */}
          <div>
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
                    sections[d.key] ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50 border border-gray-100'
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
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={!canExport || !canExportDashboard}
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
              onClick={() => handleExport('pdf')}
              disabled={!canExport || !canExportDashboard}
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
          <button onClick={onClose} className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
