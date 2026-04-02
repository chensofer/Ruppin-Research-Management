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
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

const fmt = (n) =>
  n ? `₪${new Intl.NumberFormat('he-IL').format(n)}` : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('he-IL') : '—';

export default function StepSummary({ details, budgetCategories, teamMembers, assistants, expenses, documents }) {
  const totalBudget = parseFloat(details.totalBudget) || 0;
  const totalAllocated = budgetCategories.reduce((s, c) => s + (parseFloat(c.allocatedAmount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.requestedAmount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Research details */}
      <Section title="פרטי המחקר">
        <Row label="שם המחקר" value={details.projectNameHe} />
        {details.projectNameEn && <Row label="שם באנגלית" value={details.projectNameEn} />}
        <Row label="סטטוס" value={details.status} />
        <Row label="תקציב כולל" value={fmt(totalBudget)} />
        <Row label="מקור מימון" value={details.fundingSource} />
        <Row label="תחילה" value={fmtDate(details.startDate)} />
        <Row label="סיום" value={fmtDate(details.endDate)} />
        {details.projectDescription && (
          <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-50 leading-relaxed">
            {details.projectDescription}
          </p>
        )}
      </Section>

      {/* Budget categories */}
      {budgetCategories.filter((c) => c.categoryName).length > 0 && (
        <Section title={`קטגוריות תקציב (${budgetCategories.filter((c) => c.categoryName).length})`}>
          <div className="space-y-1">
            {budgetCategories.filter((c) => c.categoryName).map((c) => (
              <div key={c._key} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">{c.categoryName}</span>
                <span className="font-medium text-primary">{fmt(c.allocatedAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100 mt-1">
              <span className="text-gray-700">סה״כ מוקצה</span>
              <span className="text-primary">{fmt(totalAllocated)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Team */}
      {teamMembers.length > 0 && (
        <Section title={`צוות המחקר (${teamMembers.length})`}>
          <div className="space-y-1.5">
            {teamMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                  </div>
                  <span className="text-gray-800">{m.firstName} {m.lastName}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m.projectRole}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Assistants */}
      {assistants.length > 0 && (
        <Section title={`עוזרי מחקר (${assistants.length})`}>
          <div className="space-y-1.5">
            {assistants.map((a, i) => (
              <div key={a.assistantUserId ?? i} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">
                  {a.isNewUser ? `${a.firstName} ${a.lastName} (חדש)` : `${a.firstName} ${a.lastName}`}
                </span>
                {a.salaryPerHour && (
                  <span className="text-xs text-gray-400">{fmt(a.salaryPerHour)}/שעה</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <Section title={`הוצאות (${expenses.length})`}>
          <div className="space-y-1">
            {expenses.map((e) => (
              <div key={e._key} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">{e.requestTitle || 'הוצאה ללא שם'}</span>
                <span className="font-medium text-red-600">{fmt(e.requestedAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100 mt-1">
              <span className="text-gray-700">סה״כ הוצאות</span>
              <span className="text-red-600">{fmt(totalExpenses)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Section title={`מסמכים (${documents.length})`}>
          <div className="space-y-1">
            {documents.map((d) => (
              <div key={d._key} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-gray-400">📁 {d.folder} /</span>
                <span>{d.fileName}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
