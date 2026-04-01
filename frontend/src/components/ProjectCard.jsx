import { useNavigate } from 'react-router-dom';

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

export default function ProjectCard({ project }) {
  const navigate = useNavigate();
  const budget = project.totalBudget || 0;
  const expenses = project.researchExpenses || 0;
  const remaining = budget - expenses;
  const usagePercent = budget > 0 ? Math.min(Math.round((expenses / budget) * 100), 100) : 0;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Top row: status badge */}
      <div className="flex justify-end">
        <StatusBadge status={project.status} />
      </div>

      {/* Project name */}
      <div>
        <h3 className="text-base font-bold text-gray-900 leading-snug text-center">
          {project.projectNameHe || project.projectNameEn || `מחקר #${project.projectId}`}
        </h3>
        {project.projectId && (
          <p className="text-xs text-gray-400 text-center mt-1">
            מס׳ מחקר: {project.projectId}
          </p>
        )}
      </div>

      {/* Researcher */}
      {project.principalResearcherId && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {project.principalResearcherId}
        </div>
      )}

      {/* Budget row */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between text-center">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">יתרה</p>
            <p className="text-base font-bold text-success">₪{formatCurrency(remaining)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">תקציב כולל</p>
            <p className="text-base font-bold text-gray-800">₪{formatCurrency(budget)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{usagePercent}%</span>
            <span>ניצול תקציב</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => navigate(`/projects/${project.projectId}`)}
        className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        כניסה למחקר
      </button>
    </div>
  );
}
