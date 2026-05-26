import { useState } from 'react';
import { getCategories } from '../../api/categoriesApi';
import HebrewDatePicker from '../HebrewDatePicker';
import { getProviders, createProvider } from '../../api/providersApi';
import { createPaymentRequest, uploadQuotationFile, notifyPaymentRequest, analyzeDocuments } from '../../api/paymentRequestsApi';
import { celebrate } from '../../utils/celebrate';
import { useEffect } from 'react';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

const inputCls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

const STATUS_FILTERS = ['הכל', 'ממתין', 'אושר', 'נדחה'];

function StatusBadge({ status }) {
  const styles = {
    'אושר': 'bg-green-100 text-green-700',
    'שולם': 'bg-green-100 text-green-700',
    'נדחה': 'bg-red-100 text-red-700',
    'ממתין': 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'ממתין'}
    </span>
  );
}

const EMPTY_FORM = {
  categoryName: '',
  requestTitle: '',
  requestDescription: '',
  requestedAmount: '',
  requestDate: new Date().toISOString().slice(0, 10),
  providerId: '',
  comments: '',
};

export default function TabPayments({ projectId, payments, onCreated, readOnly = false }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [newProvider, setNewProvider] = useState({ providerName: '', phone: '', email: '', notes: '' });
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (!showForm) return;
    getCategories().then((r) => setCategories(r.data)).catch(() => {});
    getProviders().then((r) => setProviders(r.data)).catch(() => {});
  }, [showForm]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAddProvider = async () => {
    setProviderError('');
    if (!newProvider.providerName.trim()) {
      setProviderError('שם הספק הוא שדה חובה');
      return;
    }
    if (!newProvider.phone.trim() && !newProvider.email.trim()) {
      setProviderError('יש להזין מספר טלפון או כתובת אימייל לפחות');
      return;
    }
    try {
      const res = await createProvider({
        providerName: newProvider.providerName.trim(),
        phone: newProvider.phone.trim() || null,
        email: newProvider.email.trim() || null,
        notes: newProvider.notes.trim() || null,
      });
      setProviders((prev) => [...prev, res.data]);
      setForm((f) => ({ ...f, providerId: String(res.data.providerId) }));
      setNewProvider({ providerName: '', phone: '', email: '', notes: '' });
      setShowNewProvider(false);
    } catch {
      setError('שגיאה בהוספת ספק');
    }
  };

  const handleScanDocument = async () => {
    if (selectedFiles.length === 0) { setError('יש לבחור קובץ לסריקה תחילה'); return; }
    setScanning(true);
    setError('');
    try {
      const res = await analyzeDocuments(selectedFiles);
      const d = res.data;
      setForm(f => ({
        ...f,
        requestTitle:       d.requestTitle       ?? f.requestTitle,
        requestedAmount:    d.requestedAmount     ? String(d.requestedAmount) : f.requestedAmount,
        requestDescription: d.requestDescription  ?? f.requestDescription,
        requestDate:        d.requestDate         ?? f.requestDate,
      }));
      // Handle provider from scanned document
      if (d.providerName) {
        const match = providers.find(p =>
          p.providerName?.toLowerCase().includes(d.providerName.toLowerCase()) ||
          d.providerName.toLowerCase().includes(p.providerName?.toLowerCase() ?? '')
        );
        if (match) {
          // Existing provider found — select automatically
          setForm(f => ({ ...f, providerId: String(match.providerId) }));
        } else {
          // Not found — pre-fill new provider form (phone + email too) and ask user to confirm
          setNewProvider(prev => ({
            ...prev,
            providerName: d.providerName,
            phone: d.providerPhone ?? prev.phone,
            email: d.providerEmail ?? prev.email,
          }));
          setShowNewProvider(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בסריקת המסמך');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.categoryName) { setError('יש לבחור קטגורית הוצאה'); return; }
    if (!form.requestTitle?.trim()) { setError('יש להזין כותרת לבקשה'); return; }
    if (!form.requestedAmount || parseFloat(form.requestedAmount) <= 0) {
      setError('יש להזין סכום תקין'); return;
    }
    if (!form.providerId) { setError('יש לבחור ספק'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await createPaymentRequest(projectId, {
        categoryName: form.categoryName,
        requestTitle: form.requestTitle || null,
        requestDescription: form.requestDescription || null,
        requestedAmount: parseFloat(form.requestedAmount),
        requestDate: form.requestDate || null,
        providerId: parseInt(form.providerId),
        comments: form.comments || null,
      });

      // Capture files before clearing state
      const filesToUpload = [...selectedFiles];
      setForm(EMPTY_FORM);
      setSelectedFiles([]);
      setShowForm(false);
      celebrate('payment_submitted');
      onCreated();

      // Upload files then notify secretariat by email
      const newId = res.data.paymentRequestId;
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          try { await uploadQuotationFile(newId, file); } catch { /* ignore */ }
        }
        onCreated();
      }
      // Send email after files are uploaded (includes attachments)
      try { await notifyPaymentRequest(newId); } catch { /* ignore */ }
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשמירת הבקשה');
    } finally {
      setSaving(false);
    }
  };

  // Sort newest first by ID
  const sortedPayments = [...payments].sort((a, b) => b.paymentRequestId - a.paymentRequestId);

  const filteredPayments = statusFilter === 'הכל'
    ? sortedPayments
    : sortedPayments.filter((p) => (p.status || 'ממתין') === statusFilter);

  const countFor = (s) => s === 'הכל'
    ? payments.length
    : payments.filter((p) => (p.status || 'ממתין') === s).length;

  const closeForm = () => { setShowForm(false); setError(''); setSelectedFiles([]); setShowNewProvider(false); setProviderError(''); };

  return (
    <div className="space-y-4">
      {/* Trigger button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          בקשה חדשה
        </button>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">בקשת תשלום חדשה</h2>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">קטגורית הוצאה <span className="text-red-500">*</span></label>
                  <select value={form.categoryName} onChange={set('categoryName')} className={inputCls}>
                    <option value="">— בחר קטגורית הוצאה —</option>
                    {categories.map((c) => (
                      <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">סכום (₪) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={form.requestedAmount} onChange={set('requestedAmount')}
                    placeholder="0" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">כותרת <span className="text-red-500">*</span></label>
                  <input type="text" value={form.requestTitle} onChange={set('requestTitle')}
                    placeholder="כותרת הבקשה" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">תאריך בקשה</label>
                  <HebrewDatePicker
                    value={form.requestDate}
                    onChange={(iso) => setForm((f) => ({ ...f, requestDate: iso }))}
                    maxDate={new Date().toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">ספק <span className="text-red-500">*</span></label>
                  {showNewProvider ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value={newProvider.providerName}
                          onChange={(e) => setNewProvider((p) => ({ ...p, providerName: e.target.value }))}
                          placeholder="שם הספק *" className={inputCls} />
                        <input type="tel" value={newProvider.phone}
                          onChange={(e) => setNewProvider((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="טלפון" className={inputCls} />
                        <input type="email" value={newProvider.email}
                          onChange={(e) => setNewProvider((p) => ({ ...p, email: e.target.value }))}
                          placeholder="אימייל" className={inputCls} />
                        <input type="text" value={newProvider.notes}
                          onChange={(e) => setNewProvider((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="הערות" className={inputCls} />
                      </div>
                      {providerError && <p className="text-xs text-red-500">{providerError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={handleAddProvider}
                          className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-dark">הוסף ספק</button>
                        <button type="button" onClick={() => { setShowNewProvider(false); setNewProvider({ providerName: '', phone: '', email: '', notes: '' }); setProviderError(''); }}
                          className="px-3 py-1.5 text-gray-500 border border-gray-200 text-xs rounded-lg hover:bg-gray-50">ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select value={form.providerId} onChange={set('providerId')} className={`${inputCls} flex-1`}>
                        <option value="">— ללא ספק —</option>
                        {providers.map((p) => (
                          <option key={p.providerId} value={p.providerId}>{p.providerName}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowNewProvider(true)}
                        className="text-xs text-primary hover:text-primary-dark whitespace-nowrap px-2">+ ספק חדש</button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">תיאור</label>
                <textarea rows={3} value={form.requestDescription} onChange={set('requestDescription')}
                  placeholder="פרטים נוספים..." className={`${inputCls} resize-none`} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">קבצי הצעת מחיר</label>
                  <button
                    type="button"
                    onClick={handleScanDocument}
                    disabled={selectedFiles.length === 0 || scanning}
                    title={selectedFiles.length === 0 ? 'בחר קובץ תחילה' : 'מלא טופס אוטומטית מתוך המסמך'}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {scanning ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : '🤖'}
                    {scanning ? 'סורק...' : 'מלא טופס אוטומטית'}
                  </button>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const added = Array.from(e.target.files);
                    setSelectedFiles((prev) => {
                      const existingNames = new Set(prev.map((f) => f.name));
                      return [...prev, ...added.filter((f) => !existingNames.has(f.name))];
                    });
                    e.target.value = '';
                  }}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {selectedFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-600 truncate">{f.name}</span>
                        <button type="button" onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-500 mr-2 flex-shrink-0">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/60 rounded-b-2xl">
              <button type="button" onClick={closeForm}
                className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                ביטול
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'שולח...' : 'שליחת בקשה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm font-semibold text-gray-700">
            בקשות תשלום שהוגשו ({filteredPayments.length})
          </span>
          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {s} ({countFor(s)})
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            {payments.length === 0 ? 'אין בקשות תשלום עדיין' : 'אין בקשות בסטטוס זה'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-right font-medium w-8"></th>
                  <th className="px-5 py-3 text-right font-medium">כותרת</th>
                  <th className="px-5 py-3 text-right font-medium">קטגורית הוצאה</th>
                  <th className="px-5 py-3 text-right font-medium">סכום</th>
                  <th className="px-5 py-3 text-right font-medium">תאריך שליחת בקשה</th>
                  <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((p) => (
                  <>
                    <tr
                      key={p.paymentRequestId}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === p.paymentRequestId ? null : p.paymentRequestId)}
                    >
                      <td className="px-5 py-3.5 text-gray-400">
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedRow === p.paymentRequestId ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {p.requestTitle || `בקשה #${p.paymentRequestId}`}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{p.categoryName || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{fmt(p.requestedAmount)}</td>
                      <td className="px-5 py-3.5 text-gray-500">{fmtDate(p.requestDate)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                    </tr>
                    {expandedRow === p.paymentRequestId && (
                      <tr key={`${p.paymentRequestId}-expanded`} className="bg-blue-50/40">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <dt className="text-gray-400 mb-0.5">שולח הבקשה</dt>
                              <dd className="text-gray-700 font-medium">{p.requestedByUserName || p.requestedByUserId || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400 mb-0.5">ספק</dt>
                              <dd className="text-gray-700 font-medium">{p.providerName || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400 mb-0.5">תאריך אישור / דחייה</dt>
                              <dd className="text-gray-700 font-medium">{fmtDate(p.decisionDate)}</dd>
                            </div>
                            {p.rejectionReason && (
                              <div>
                                <dt className="text-gray-400 mb-0.5">סיבת דחייה</dt>
                                <dd className="text-gray-700 font-medium">{p.rejectionReason}</dd>
                              </div>
                            )}
                            {p.requestDescription && (
                              <div className="col-span-3">
                                <dt className="text-gray-400 mb-0.5">תיאור</dt>
                                <dd className="text-gray-700">{p.requestDescription}</dd>
                              </div>
                            )}
                            {p.quotationFilePath && (
                              <div className="col-span-3">
                                <dt className="text-gray-400 mb-1">קבצי הצעת מחיר</dt>
                                <dd className="flex flex-wrap gap-2">
                                  {p.quotationFilePath.split(';').filter(Boolean).map((path, i) => {
                                    const name = path.split('/').pop();
                                    return (
                                      <a
                                        key={i}
                                        href={`http://localhost:5269${path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        {name}
                                      </a>
                                    );
                                  })}
                                </dd>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
