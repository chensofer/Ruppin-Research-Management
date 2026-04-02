import { useRef, useState } from 'react';

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400';

export default function StepDocuments({ files, folders, onFilesChange, onFoldersChange }) {
  const fileInputRef = useRef();
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(folders[0] ?? 'כללי');
  const [openFolders, setOpenFolders] = useState(new Set(folders));

  const allFolders = folders.length > 0 ? folders : ['כללי'];

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name || folders.includes(name)) return;
    const updated = [...folders, name];
    onFoldersChange(updated);
    setOpenFolders((prev) => new Set([...prev, name]));
    setSelectedFolder(name);
    setNewFolderName('');
  };

  const removeFolder = (folder) => {
    onFoldersChange(folders.filter((f) => f !== folder));
    onFilesChange(files.filter((f) => f.folder !== folder));
    if (selectedFolder === folder) setSelectedFolder(allFolders[0] ?? 'כללי');
  };

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files);
    const newFiles = picked.map((file) => ({
      _key: crypto.randomUUID(),
      folder: selectedFolder,
      fileName: file.name,
      file,
    }));
    onFilesChange([...files, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (key) => onFilesChange(files.filter((f) => f._key !== key));

  const toggleFolder = (folder) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });

  const filesByFolder = (folder) => files.filter((f) => f.folder === folder);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Folder creation */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">ניהול תיקיות</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFolder()}
            placeholder="שם תיקייה חדשה..."
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={addFolder}
            className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            + צור
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {allFolders.map((folder) => (
            <span
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                selectedFolder === folder
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              📁 {folder}
              {folder !== 'כללי' && (
                <span
                  onClick={(e) => { e.stopPropagation(); removeFolder(folder); }}
                  className="opacity-70 hover:opacity-100 ml-0.5"
                >✕</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors bg-white"
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-500">
          לחץ להעלאת קבצים לתיקייה: <span className="font-semibold text-primary">{selectedFolder}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, תמונות</p>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePick} />
      </div>

      {/* File tree */}
      {allFolders.map((folder) => {
        const folderFiles = filesByFolder(folder);
        if (folderFiles.length === 0) return null;
        const isOpen = openFolders.has(folder);

        return (
          <div key={folder} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleFolder(folder)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">📁</span>
              <span className="text-sm font-medium text-gray-700">{folder}</span>
              <span className="text-xs text-gray-400 mr-auto">{folderFiles.length} קבצים</span>
            </button>

            {isOpen && (
              <ul className="divide-y divide-gray-50 px-4 pb-2">
                {folderFiles.map((f) => (
                  <li key={f._key} className="flex items-center gap-2 py-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 flex-1 truncate">{f.fileName}</span>
                    <span className="text-xs text-gray-400">{formatSize(f.file.size)}</span>
                    <button type="button" onClick={() => removeFile(f._key)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {files.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">ניתן לדלג על שלב זה אם אין מסמכים</p>
      )}
    </div>
  );
}
