const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date) ? '—' : date.toLocaleDateString('he-IL');
};

function Field({ label, value, wide = false, highlight }) {
  const display = value !== null && value !== undefined && value !== '' ? value : '—';
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs text-gray-400 mb-1">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 ${highlight ?? 'text-gray-800'}`}>
        {display}
      </dd>
    </div>
  );
}

export default function TabOverview({ detail }) {
  return (
    <div className="space-y-5">

      {/* Main info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">
          פרטי המחקר
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5">

          <Field label="שם מחקר" value={detail.projectNameHe || detail.projectNameEn} wide />

          <Field label="תיאור מחקר" value={detail.projectDescription} wide />

          <Field label="חוקר ראשי" value={detail.principalResearcherName || detail.principalResearcherId} />
          <Field label="משויך למרכז מחקר" value={detail.centerName} />

          <Field label="תאריך התחלה" value={fmtDate(detail.startDate)} />
          <Field label="מזהה מחקר" value={detail.projectId ? `#${detail.projectId}` : null} />

          <Field label="תאריך סיום משוערך" value={fmtDate(detail.endDate)} />
          <Field label="מקור מימון" value={detail.fundingSource} />

          <div>
            <dt className="text-xs text-gray-400 mb-1">בקשות תשלומים הממתינות לאישור</dt>
            <dd className="text-sm font-medium mt-0.5">
              {detail.pendingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-yellow-700 bg-yellow-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  {detail.pendingCount} ממתינות
                </span>
              ) : (
                <span className="text-gray-400 text-sm">אין בקשות ממתינות</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-gray-400 mb-1">סה״כ הוצאות שאושרו</dt>
            <dd className={`text-sm font-semibold mt-0.5 ${
              (detail.approvedTotal ?? detail.totalPaid ?? 0) > 0
                ? 'text-green-600'
                : 'text-gray-400'
            }`}>
              {fmt(detail.approvedTotal ?? detail.totalPaid)}
            </dd>
          </div>

        </dl>
      </div>

      {/* Researchers */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
          חוקרים {detail.teamMembers?.length > 0 && `(${detail.teamMembers.length})`}
        </h2>
        {detail.teamMembers?.length > 0 ? (
          <div className="space-y-3">
            {detail.teamMembers.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{m.userId}</p>
                </div>
                {m.projectRole && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                    {m.projectRole}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">לא משויכים חוקרים</p>
        )}
      </div>

      {/* Research Assistants */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
          עוזרי מחקר {detail.assistants?.length > 0 && `(${detail.assistants.length})`}
        </h2>
        {detail.assistants?.length > 0 ? (
          <div className="space-y-3">
            {detail.assistants.map((a) => (
              <div key={a.assistantUserId} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{a.assistantUserId}</p>
                </div>
                {a.salaryPerHour && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                    {fmt(a.salaryPerHour)}/שעה
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">לא משויכים עוזרי מחקר</p>
        )}
      </div>

    </div>
  );
}
