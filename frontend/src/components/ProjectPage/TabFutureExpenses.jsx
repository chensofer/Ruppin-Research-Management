import { useState, useEffect } from 'react';
import { getCategories } from '../../api/categoriesApi';
import HebrewDatePicker from '../HebrewDatePicker';
import { addCommitment, updateCommitment, deleteCommitment, uploadCommitmentFile } from '../../api/projectsApi';
import { analyzeDocuments } from '../../api/paymentRequestsApi';
import { fileUrl } from '../../utils/fileUrl';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

const inputCls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const EMPTY = { categoryName: '', commitmentDescription: '', expectedDate: '', expectedAmount: '', notes: '' };

export default function TabFutureExpenses({ projectId, commitments, availableBalance, onChanged, readOnly = false }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (!showForm) return;
    getCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, [showForm]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleScan = async () => {
    if (selectedFiles.length === 0) { setError('יש לבחור קובץ לסריקה תחילה'); return; }
    setScanning(true);
    setError('');
    try {
      const res = await analyzeDocuments(selectedFiles);
      const d = res.data;
      setForm(f => ({
        ...f,
        commitmentDescription: d.requestTitle ?? f.commitmentDescription,
        expectedAmount:        d.requestedAmount ? String(d.requestedAmount) : f.expectedAmount,
        notes: [
          d.requestDescription ?? '',
          d.providerName ? `ספק: ${d.providerName}` : '',
        ].filter(Boolean).join(' | ') || f.notes,
      }));
    } catch {
      setError('סריקת המסמך נכשלה — ניתן למלא את הפרטים ידנית');
    } finally {
      setScanning(false);
    }
  };

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
    setSelectedFiles([]);
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
      let commitmentId = editingId;
      if (editingId) {
        await updateCommitment(projectId, editingId, payload);
      } else {
        const res = await addCommitment(projectId, payload);
        commitmentId = res.data.commitmentId;
      }
      const filesToUpload = [...selectedFiles];
      setForm(EMPTY);
      setEditingId(null);
      setSelectedFiles([]);
      setShowForm(false);
      onChanged();
      if (filesToUpload.length > 0 && commitmentId) {
        for (const file of filesToUpload) {
          try { await uploadCommitmentFile(projectId, commitmentId, file); } catch {}
        }
        onChanged();
      }
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
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-blue-700 font-medium">יתרה זמינה להתחייבויות: {fmt(availableBalance)}</span>
        <span className="text-sm text-blue-500">לאחר ניכוי הוצאות שאושרו</span>
      </div>

      {/* Trigger button */}
      {!readOnly && (
        <button type="button" onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הוצאה עתידית חדשה
        </button>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingId ? 'עריכת הוצאה עתידית' : 'הוצאה עתידית חדשה'}
              </h2>
              <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">קטגוריה</label>
                  <select value={form.categoryName} onChange={set('categoryName')} className={inputCls}>
                    <option value="">— בחר קטגוריה —</option>
                    {categories.map((c) => (
                      <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">סכום (₪) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={form.expectedAmount} onChange={set('expectedAmount')}
                    placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">תאריך צפוי <span className="text-red-500">*</span></label>
                  <HebrewDatePicker
                    value={form.expectedDate}
                    onChange={(iso) => setForm((f) => ({ ...f, expectedDate: iso }))}
                    placeholder="בחר תאריך"
                    minDate={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">תיאור</label>
                  <input type="text" value={form.commitmentDescription} onChange={set('commitmentDescription')}
                    placeholder="תיאור קצר" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">הערות</label>
                <textarea rows={3} value={form.notes} onChange={set('notes')}
                  placeholder="הערות נוספות..." className={`${inputCls} resize-none`} />
              </div>

              {/* File upload + OCR */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-500">קבצים מצורפים (לא חובה)</label>
                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleScan}
                      disabled={scanning}
                      title="מלא טופס אוטומטית מתוך המסמך"
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {scanning ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                        </svg>
                      )}
                      {scanning ? 'סורק...' : 'מלא טופס אוטומטית'}
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const added = Array.from(e.target.files);
                    setSelectedFiles((prev) => {
                      const existingNames = new Set(prev.map((f) => f.name));
                      return [...prev, ...added.filter((f) => !existingNames.has(f.name))];
                    });
                    e.target.value = '';
                  }}
                  className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {selectedFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-600 truncate">{f.name}</span>
                        <button type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-500 mr-2 flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/60 rounded-b-2xl">
              <button type="button" onClick={handleCancel}
                className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                ביטול
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'שומר...' : editingId ? 'שמור שינויים' : 'הוסף התחייבות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">הוצאות עתידיות ({commitments.length})</span>
          <span className="text-sm font-medium text-gray-500">סה״כ: {fmt(total)}</span>
        </div>
        {commitments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">אין התחייבויות עתידיות</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                  <th className="px-5 py-3 text-right font-medium">תיאור</th>
                  <th className="px-5 py-3 text-right font-medium">תאריך צפוי</th>
                  <th className="px-5 py-3 text-right font-medium">סכום</th>
                  <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                  <th className="px-5 py-3 text-right font-medium">קבצים</th>
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
                      <span className="text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.filePath ? (
                        <div className="flex flex-wrap gap-1">
                          {c.filePath.split(';').filter(Boolean).map((path, i) => {
                            const name = path.split('/').pop();
                            return (
                              <a key={i}
                                href={fileUrl(path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary bg-primary/10 hover:bg-primary/20 text-sm px-2 py-0.5 rounded-lg transition-colors"
                                title={name}
                              >
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span className="max-w-[80px] truncate">{name}</span>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-left">
                      <div className="flex items-center gap-1 justify-end">
                        {!readOnly && <>
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
                        </>}
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
