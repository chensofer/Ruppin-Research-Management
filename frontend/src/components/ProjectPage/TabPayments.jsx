import { useState } from 'react';
import { getCategories } from '../../api/categoriesApi';
import { getProviders, createProvider } from '../../api/providersApi';
import { createPaymentRequest } from '../../api/paymentRequestsApi';
import { useEffect } from 'react';

const fmt = (n) =>
  n != null ? `₪${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)}` : '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

const inputCls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

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
  dueDate: '',
  comments: '',
};

export default function TabPayments({ projectId, payments, onCreated }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [newProvider, setNewProvider] = useState('');
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showForm) return;
    getCategories().then((r) => setCategories(r.data)).catch(() => {});
    getProviders().then((r) => setProviders(r.data)).catch(() => {});
  }, [showForm]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAddProvider = async () => {
    if (!newProvider.trim()) return;
    try {
      const res = await createProvider({ providerName: newProvider.trim() });
      setProviders((prev) => [...prev, res.data]);
      setForm((f) => ({ ...f, providerId: String(res.data.providerId) }));
      setNewProvider('');
      setShowNewProvider(false);
    } catch {
      setError('שגיאה בהוספת ספק');
    }
  };

  const handleSubmit = async () => {
    if (!form.categoryName) { setError('יש לבחור קטגוריה'); return; }
    if (!form.requestedAmount || parseFloat(form.requestedAmount) <= 0) {
      setError('יש להזין סכום תקין'); return;
    }
    setSaving(true);
    setError('');
    try {
      await createPaymentRequest(projectId, {
        categoryName: form.categoryName,
        requestTitle: form.requestTitle || null,
        requestDescription: form.requestDescription || null,
        requestedAmount: parseFloat(form.requestedAmount),
        requestDate: form.requestDate || null,
        providerId: form.providerId ? parseInt(form.providerId) : null,
        dueDate: form.dueDate || null,
        comments: form.comments || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      onCreated();
    } catch {
      setError('שגיאה בשמירת הבקשה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* New request form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">בקשת תשלום חדשה</h3>
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">קטגוריה <span className="text-red-500">*</span></label>
              <select value={form.categoryName} onChange={set('categoryName')} className={inputCls}>
                <option value="">— בחר קטגוריה —</option>
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
              <label className="block text-xs text-gray-500 mb-1">כותרת</label>
              <input type="text" value={form.requestTitle} onChange={set('requestTitle')}
                placeholder="כותרת הבקשה" className={inputCls} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך בקשה</label>
              <input type="date" value={form.requestDate} onChange={set('requestDate')} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">ספק</label>
              {showNewProvider ? (
                <div className="flex gap-2">
                  <input type="text" value={newProvider} onChange={(e) => setNewProvider(e.target.value)}
                    placeholder="שם הספק" className={`${inputCls} flex-1`} />
                  <button type="button" onClick={handleAddProvider}
                    className="px-3 py-2 bg-primary text-white text-xs rounded-lg">הוסף</button>
                  <button type="button" onClick={() => setShowNewProvider(false)}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600 text-xs">ביטול</button>
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
                    className="text-xs text-primary hover:text-primary-dark whitespace-nowrap">+ ספק חדש</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך לתשלום</label>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">תיאור</label>
            <textarea rows={2} value={form.requestDescription} onChange={set('requestDescription')}
              placeholder="פרטים נוספים..." className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              ביטול
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60">
              {saving ? 'שומר...' : 'שמור בקשה'}
            </button>
          </div>
        </div>
      ) : (
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

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 text-right">
          <span className="text-sm font-semibold text-gray-700">בקשות תשלום ({payments.length})</span>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">אין בקשות תשלום עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-right font-medium">כותרת</th>
                  <th className="px-5 py-3 text-right font-medium">קטגוריה</th>
                  <th className="px-5 py-3 text-right font-medium">סכום</th>
                  <th className="px-5 py-3 text-right font-medium">תאריך</th>
                  <th className="px-5 py-3 text-right font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.paymentRequestId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {p.requestTitle || `בקשה #${p.paymentRequestId}`}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.categoryName || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{fmt(p.requestedAmount)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(p.requestDate)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
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
