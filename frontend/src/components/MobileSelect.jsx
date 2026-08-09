import { useState, useRef, useEffect } from 'react';

export default function MobileSelect({ value, onChange, options, placeholder = '— בחר —', className = '', searchable = false, searchPlaceholder = 'חיפוש...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const visibleOptions = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} dir="rtl">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {!disabled && open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className="w-full text-right px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                {placeholder}
              </button>
            )}
            {visibleOptions.length > 0 ? visibleOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                  String(o.value) === String(value)
                    ? 'bg-primary-light text-primary font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            )) : (
              searchable && <p className="px-4 py-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
