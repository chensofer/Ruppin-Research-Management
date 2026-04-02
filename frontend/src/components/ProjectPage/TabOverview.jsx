const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

export default function TabOverview({ detail }) {
  return (
    <div className="space-y-4">
      {detail.projectDescription && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">תיאור המחקר</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{detail.projectDescription}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">פרטים כלליים</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <InfoRow label="מזהה מחקר" value={`#${detail.projectId}`} />
          <InfoRow label="חוקר ראשי" value={detail.principalResearcherName || detail.principalResearcherId} />
          <InfoRow label="מרכז מחקר" value={detail.centerName} />
          <InfoRow label="מקור מימון" value={detail.fundingSource} />
          <InfoRow label="תאריך התחלה" value={fmtDate(detail.startDate)} />
          <InfoRow label="תאריך סיום" value={fmtDate(detail.endDate)} />
          <div>
            <dt className="text-xs text-gray-400">בקשות ממתינות</dt>
            <dd className="text-sm font-medium text-yellow-600 mt-0.5">{detail.pendingCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">סה״כ אושר לתשלום</dt>
            <dd className="text-sm font-medium text-green-600 mt-0.5">{fmt(detail.approvedTotal)}</dd>
          </div>
        </dl>
      </div>

      {/* Team snapshot */}
      {detail.teamMembers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            חוקרים ({detail.teamMembers.length})
          </h2>
          <div className="space-y-2">
            {detail.teamMembers.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-gray-400">{m.userId}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.projectRole}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assistants snapshot */}
      {detail.assistants?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            עוזרי מחקר ({detail.assistants.length})
          </h2>
          <div className="space-y-2">
            {detail.assistants.map((a) => (
              <div key={a.assistantUserId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-gray-400">{a.assistantUserId}</p>
                </div>
                {a.salaryPerHour && (
                  <span className="text-xs text-gray-500">{fmt(a.salaryPerHour)}/שעה</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
