import { useEffect, useState } from 'react';
import { getCategories, createCategory } from '../../api/categoriesApi';

const NEW_KEY = '__new__';

const inputCls =
  'w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

export default function CategoryPicker({ value, onChange, placeholder = 'בחר קטגוריה' }) {
  const [categories, setCategories] = useState([]);
  const [showNew, setShowNew]       = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const handleSelect = (e) => {
    if (e.target.value === NEW_KEY) {
      setShowNew(true);
    } else {
      setShowNew(false);
      onChange(e.target.value);
    }
  };

  const saveNew = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await createCategory({ categoryName: name, categoryDescription: newDesc.trim() || null });
      const saved = res.data;
      setCategories((prev) => {
        const filtered = prev.filter((c) => c.categoryName !== saved.categoryName);
        return [...filtered, saved].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      });
      onChange(saved.categoryName);
      setShowNew(false);
      setNewName('');
      setNewDesc('');
    } catch {
      setSaveError('שגיאה בשמירת הקטגוריה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={showNew ? NEW_KEY : (value || '')}
        onChange={handleSelect}
        className={inputCls}
      >
        <option value="">{placeholder}</option>
        {categories.map((c) => (
          <option key={c.categoryName} value={c.categoryName}>{c.categoryName}</option>
        ))}
        <option value={NEW_KEY}>＋ הוסף קטגוריה חדשה...</option>
      </select>

      {showNew && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNew()}
            placeholder="שם קטגוריה חדשה *"
            className={inputCls}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className={inputCls}
          />
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveNew}
              disabled={saving || !newName.trim()}
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'שמור קטגוריה'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
              className="px-3 py-1.5 text-gray-500 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
