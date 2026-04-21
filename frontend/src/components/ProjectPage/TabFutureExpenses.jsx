import { useState, useEffect } from 'react';
import { getCategories } from '../../api/categoriesApi';
import HebrewDatePicker from '../HebrewDatePicker';
import { addCommitment, updateCommitment, deleteCommitment } from '../../api/projectsApi';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

const inputCls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const EMPTY = { categoryName: '', commitmentDescription: '', expectedDate: '', expectedAmount: '', notes: '' };

export default function TabFutureExpenses({ projectId, commitments, availableBalance, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showForm) return;
    getCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, [showForm]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const todayStr = new Date().toISOString().slice(0, 10);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.commitmentId);
    setForm({
      categoryName: c.categoryName || '',
      commitmentDescription: c.commitmentDescription || '',
      expectedDate: c.expectedDate || '',
      expectedAmount: String(c.expectedAmount ?? ''),
      notes: c.notes || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.expectedAmount || parseFloat(form.expectedAmount) <= 0) {
      setError('יש להזין סכום תקין'); return;
    }
    if (!form.expectedDate || form.expectedDate <= todayStr) {
      setError('התאריך הצפוי חייב להיות בעתיד'); return;
    }
    const amount = parseFloat(form.expectedAmount);
    const editingCommitment = commitments.find((c) => c.commitmentId === editingId);
    const previousAmount = editingId ? (parseFloat(editingCommitment?.expectedAmount) || 0) : 0;
    const effectiveBalance = availableBalance + previousAmount;
    if (amount > effectiveBalance) {
      setError(`הסכום המבוקש (${fmt(amount)}) עולה על היתרה הזמינה (${fmt(effectiveBalance)})`);
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      categoryName: form.categoryName || null,
      commitmentDescription: form.commitmentDescription || null,
      expectedDate: form.expectedDate || null,
      expectedAmount: amount,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await updateCommitment(projectId, editingId, payload);
      } else {
        await addCommitment(projectId, payload);
      }
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
      onChanged();
    } catch {
      setError(editingId ? 'שגיאה בעדכון ההתחייבות' : 'שגיאה בשמירת ההתחייבות');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commitmentId) => {
    setDeleting(commitmentId);
    try {
      await deleteCommitment(projectId, commitmentId);
      onChanged();
    } catch {
      setError('שגיאה במחיקת ההתחייבות');
    } finally {
      setDeleting(null);
    }
  };

  const total = commitments.reduce((s, c) => s + (parseFloat(c.expectedAmount) || 0), 0);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Balance banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-blue-700 font-medium">יתרה זמינה להתחייבויות: {fmt(availableBalance)}</span>
        <span className="text-xs text-blue-500">לאחר ניכוי הוצאות שאושרו</span>
      </div>

      {/* Add / Edit form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'עריכת הוצאה עתידית' : 'הוצאה עתידית חדשה'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">קטגוריה</label>
              <select value={form.categoryName} onChange={set('categoryName')} className={inputCls}>
                <option value="">— בחר קטגוריה —</option>
                {categories.map((c) => (
                  <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סכום (₪) <span className="text-red-500">*</span></label>
              <input type="number" min={0} value={form.expectedAmount} onChange={set('expectedAmount')}
                placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך צפוי <span className="text-red-500">*</span></label>
              <HebrewDatePicker
                value={form.expectedDate}
                onChange={(iso) => setForm((f) => ({ ...f, expectedDate: iso }))}
                placeholder="בחר תאריך"
                minDate={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תיאור</label>
              <input type="text" value={form.commitmentDescription} onChange={set('commitmentDescription')}
                placeholder="תיאור קצר" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">הערות</label>
            <textarea rows={2} value={form.notes} onChange={set('notes')}
              placeholder="הערות נוספות..." className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              ביטול
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60">
              {saving ? 'שומר...' : editingId ? 'שמור שינויים' : 'הוסף התחייבות'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הוצאה עתידית חדשה
        </button>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">סה״כ מתוכנן: {fmt(total)}</span>
          <span className="text-sm font-semibold text-gray-700">התחייבויות עתידיות ({commitments.length})</span>
        </div>
        {commitments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">אין התחייבויות עתידיות</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                  <th className="px-5 py-3 text-right font-medium">תיאור</th>
                  <th className="px-5 py-3 text-right font-medium">תאריך צפוי</th>
                  <th className="px-5 py-3 text-right font-medium">סכום</th>
                  <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commitments.map((c) => (
                  <tr key={c.commitmentId} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{c.categoryName || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{c.commitmentDescription || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(c.expectedDate)}</td>
                    <td className="px-5 py-3.5 font-medium text-orange-600">{fmt(c.expectedAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-left">
                      <div className="flex items-center gap-1 justify-end">
                        <button type="button" onClick={() => openEdit(c)}
                          className="p-1 text-gray-400 hover:text-primary transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(c.commitmentId)}
                          disabled={deleting === c.commitmentId}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
