function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

const fmt = (n) =>
  n != null && n !== '' ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : null;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : null);

export default function StepSummary({ details, budgetCategories, teamMembers, assistants, expenses, documents, centers }) {
  const totalBudget    = parseFloat(details.totalBudget) || 0;
  const totalAllocated = budgetCategories.reduce((s, c) => s + (parseFloat(c.allocatedAmount) || 0), 0);
  const totalExpenses  = expenses.reduce((s, e) => s + (parseFloat(e.requestedAmount) || 0), 0);
  const centerName     = centers?.find((c) => String(c.centerId) === String(details.centerId))?.centerName;

  return (
    <div className="space-y-4">

      {/* פרטי מחקר */}
      <Section title="פרטי מחקר">
        <Row label="שם מחקר"              value={details.projectNameHe} />
        <Row label="שם מחקר באנגלית"      value={details.projectNameEn} />
        <Row label="חוקר ראשי"            value={
          details.principalResearcherName
            ? `${details.principalResearcherName}${details.principalResearcherRole ? ` — ${details.principalResearcherRole}` : ''}`
            : null
        } />
        <Row label="ת״ז חוקר ראשי"         value={details.principalResearcherId || null} />
        <Row label="מרכז מחקר"            value={centerName ?? (details.centerId ? null : 'לא שויך')} />
        <Row label="תקציב מאושר"          value={fmt(totalBudget)} />
        <Row label="מקור מימון"           value={details.fundingSource || null} />
        <Row label="תאריך התחלה"          value={fmtDate(details.startDate)} />
        <Row label="תאריך סיום משוער"     value={fmtDate(details.endDate)} />
        {details.projectDescription?.trim() && (
          <div className="pt-2 mt-1 border-t border-gray-50">
            <p className="text-xs text-gray-500 mb-1">תיאור המחקר</p>
            <p className="text-sm text-gray-700 leading-relaxed">{details.projectDescription}</p>
          </div>
        )}
      </Section>

      {/* הגדרת תקציב */}
      {budgetCategories.filter((c) => c.categoryName).length > 0 && (
        <Section title={`הגדרת תקציב (${budgetCategories.filter((c) => c.categoryName).length} קטגוריות)`}>
          <div className="space-y-1">
            {budgetCategories.filter((c) => c.categoryName).map((c) => (
              <div key={c._key} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{c.categoryName}</span>
                <span className="font-medium text-primary">{fmt(c.allocatedAmount) ?? '—'}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200 mt-1">
              <span className="text-gray-700">סה״כ מוקצה</span>
              <span className="text-primary">{fmt(totalAllocated) ?? '₪0'}</span>
            </div>
          </div>
        </Section>
      )}

      {/* צוות מחקר */}
      {teamMembers.length > 0 && (
        <Section title={`צוות מחקר (${teamMembers.length})`}>
          <div className="space-y-2">
            {teamMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">ת"ז - {m.userId}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{m.projectRole}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* עוזרי מחקר */}
      {assistants.length > 0 && (
        <Section title={`עוזרי מחקר (${assistants.length})`}>
          <div className="space-y-2">
            {assistants.map((a, i) => (
              <div key={a.assistantUserId ?? i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {(a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                      {a.isNewUser && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">חדש</span>}
                    </div>
                    <p className="text-xs text-gray-400">ת"ז - {a.assistantUserId}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-blue-600 font-medium">עוזר מחקר</p>
                  {a.salaryPerHour && <p className="text-xs text-gray-400">{fmt(a.salaryPerHour)}/שעה</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* הוצאות */}
      {expenses.length > 0 && (
        <Section title={`הוצאות (${expenses.length})`}>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e._key} className="py-1 border-b border-gray-50 last:border-0">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{e.categoryName}</p>
                    {e.requestDescription && <p className="text-xs text-gray-400">{e.requestDescription}</p>}
                    {e.providerName && (
                      <p className="text-xs text-gray-500">
                        ספק: {e.providerName}
                        {e.isNewProvider && <span className="text-amber-600 mr-1"> (חדש)</span>}
                      </p>
                    )}
                    {e.files?.length > 0 && (
                      <p className="text-xs text-blue-500">{e.files.length} קובץ מצורף</p>
                    )}
                  </div>
                  <span className="font-semibold text-red-600">{fmt(e.requestedAmount) ?? '—'}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200 mt-1">
              <span className="text-gray-700">סה״כ הוצאות</span>
              <span className="text-red-600">{fmt(totalExpenses) ?? '₪0'}</span>
            </div>
          </div>
        </Section>
      )}

      {/* מסמכים */}
      {documents.length > 0 && (
        <Section title={`מסמכים (${documents.length})`}>
          <div className="space-y-1">
            {documents.map((d) => (
              <div key={d._key} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
                <span className="text-gray-400 text-xs">📁 {d.folder} /</span>
                <span className="truncate">{d.fileName}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {!details.projectNameHe && (
        <p className="text-sm text-gray-400 text-center py-4">אין נתונים להצגה</p>
      )}
    </div>
  );
}
