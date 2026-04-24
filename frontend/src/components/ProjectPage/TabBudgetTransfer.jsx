import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllProjects, transferBudget } from '../../api/projectsApi';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';

export default function TabBudgetTransfer({ projectId, projectName, availableBalance, onTransferred, readOnly = false }) {
  const [allProjects, setAllProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [form, setForm] = useState({ targetProjectId: '', amount: '' });
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllProjects()
      .then((r) => {
        // Exclude current project from the list
        setAllProjects((r.data || []).filter((p) => p.projectId !== Number(projectId)));
      })
      .catch(() => toast.error('שגיאה בטעינת רשימת המחקרים'))
      .finally(() => setLoadingProjects(false));
  }, [projectId]);

  const selectedProject = allProjects.find((p) => p.projectId === Number(form.targetProjectId));
  const parsedAmount = parseFloat(form.amount);

  const validate = () => {
    if (!form.targetProjectId) return 'יש לבחור מחקר יעד';
    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0) return 'יש להזין סכום תקין';
    if (parsedAmount > availableBalance) return 'יתרה זמינה לא מספיקה לביצוע ההעברה';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await transferBudget(projectId, {
        targetProjectId: Number(form.targetProjectId),
        amount: parsedAmount,
      });
      toast.success('ההעברה בוצעה בהצלחה');
      setForm({ targetProjectId: '', amount: '' });
      setStep('form');
      onTransferred();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'שגיאה בביצוע ההעברה';
      toast.error(msg);
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">העברת תקציב</span>
      </div>

      <div className="p-6 max-w-lg mx-auto">
        {readOnly && (
          <div className="text-center py-8 text-sm text-gray-400">
            <p>מחקר בארכיון — לא ניתן לבצע העברת תקציב.</p>
            <p className="mt-1">שחזר את המחקר כדי לאפשר פעולות.</p>
          </div>
        )}
        {!readOnly && <>
        {/* Available balance info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-right">
          <p className="text-xs text-blue-500 mb-0.5">יתרה זמינה במחקר הנוכחי</p>
          <p className={`text-xl font-bold ${availableBalance < 0 ? 'text-red-600' : 'text-blue-700'}`}>
            {fmt(availableBalance)}
          </p>
        </div>

        {step === 'form' && (
          <div className="space-y-5">
            {/* Target project selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מחקר יעד</label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  טוען מחקרים...
                </div>
              ) : (
                <select
                  value={form.targetProjectId}
                  onChange={(e) => { setForm((f) => ({ ...f, targetProjectId: e.target.value })); setError(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">-- בחר מחקר --</option>
                  {allProjects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectNameHe || p.projectNameEn || `מחקר #${p.projectId}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">סכום להעברה (₪)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setError(''); }}
                placeholder="הזן סכום"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleNext}
              disabled={loadingProjects}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              המשך לאישור
            </button>
          </div>
        )}

        {step === 'confirm' && selectedProject && (
          <div className="space-y-5">
            {/* Confirmation summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right space-y-3">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">אישור העברת תקציב</h3>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">סכום להעברה</span>
                <span className="font-medium text-gray-800 tabular-nums">{fmt(parsedAmount)}</span>
              </div>

              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 flex-shrink-0">ממחקר</span>
                <span className="font-medium text-gray-800 text-left truncate">
                  {projectName || `מחקר #${projectId}`}
                </span>
              </div>

              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 flex-shrink-0">למחקר</span>
                <span className="font-medium text-gray-800 text-left truncate">
                  {selectedProject.projectNameHe || selectedProject.projectNameEn || `מחקר #${selectedProject.projectId}`}
                </span>
              </div>

              <hr className="border-amber-200" />

              <p className="text-xs text-amber-700">
                לאחר האישור, הפעולה תירשם בריכוז התנועות של שני המחקרים ולא ניתן לבטלה.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                חזרה
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'אשר העברה'}
              </button>
            </div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
