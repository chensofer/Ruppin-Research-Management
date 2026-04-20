import { useNavigate } from 'react-router-dom';

const TODAY = new Date().toISOString().split('T')[0];

function getIsActive(project) {
  const rawActive = project.status === 'פעיל' || project.status === 'Active' || project.status === 'active';
  return rawActive && (!project.endDate || String(project.endDate).slice(0, 10) >= TODAY);
}

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

function UsageBar({ percent }) {
  const color =
    percent >= 90 ? '#ef4444' :
    percent >= 70 ? '#f59e0b' :
    '#5CB800';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
          {percent}%
        </span>
        <span className="text-[11px] text-gray-400">ניצול תקציב</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ProjectCard({ project }) {
  const navigate = useNavigate();
  const isActive = getIsActive(project);

  const budget       = project.totalBudget || 0;
  const totalPaid    = project.totalPaid ?? 0;
  const remaining    = project.remainingBalance ?? (budget - totalPaid);
  const available    = project.availableBalance ?? remaining;
  const usagePct     = budget > 0 ? Math.min(Math.round((totalPaid / budget) * 100), 100) : 0;

  const balanceNegative = remaining < 0;

  return (
    <div
      onClick={() => navigate(`/projects/${project.projectId}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
    >
      {/* Status stripe */}
      <div
        className="h-1"
        style={{ background: isActive ? 'linear-gradient(90deg,#5CB800,#78D900)' : '#e5e7eb' }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-gray-300 font-medium tabular-nums mt-0.5">
            #{project.projectId}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            isActive
              ? 'bg-accent-light text-accent-dark'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            )}
            {isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>

        {/* Project name */}
        <div className="text-right">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">
            {project.projectNameHe || project.projectNameEn || `מחקר #${project.projectId}`}
          </h3>
          {project.principalResearcherId && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5 justify-end">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {project.principalResearcherId}
            </p>
          )}
        </div>

        {/* Budget panel */}
        <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 space-y-3 mt-auto">
          <div className="flex justify-between items-end" dir="rtl">
            <div className="text-right">
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">יתרה זמינה</p>
              <p className={`text-xl font-extrabold tabular-nums leading-none ${
                balanceNegative ? 'text-red-600' : 'text-accent-dark'
              }`}>
                {fmt(remaining)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">תקציב</p>
              <p className="text-sm font-bold text-gray-600 tabular-nums">{fmt(budget)}</p>
            </div>
          </div>

          {project.totalFuture > 0 && (
            <div className="flex justify-between text-[11px] border-t border-gray-200 pt-2.5" dir="rtl">
              <span className="text-gray-400">זמין לאחר התחייבויות</span>
              <span className="font-semibold text-amber-600 tabular-nums">{fmt(available)}</span>
            </div>
          )}

          <UsageBar percent={usagePct} />
        </div>

      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <div className="w-full flex items-center justify-center gap-2 bg-primary group-hover:bg-primary-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150">
          כניסה למחקר
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
