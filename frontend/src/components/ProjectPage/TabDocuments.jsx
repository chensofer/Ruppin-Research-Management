import { useState } from 'react';
import { uploadProjectFile, deleteProjectFile } from '../../api/projectsApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

function FileIcon({ fileType }) {
  const isImg = fileType?.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
      isPdf ? 'bg-red-100 text-red-600' : isImg ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
    }`}>
      {isPdf ? 'PDF' : isImg ? 'IMG' : 'FILE'}
    </div>
  );
}

export default function TabDocuments({ projectId, files, onChanged }) {
  const [folder, setFolder] = useState('כללי');
  const [customFolder, setCustomFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  // Derive folder list from files
  const existingFolders = ['כללי', ...new Set(files.map((f) => f.folderName).filter(Boolean).filter((f) => f !== 'כללי'))];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folderName', folder);
    try {
      await uploadProjectFile(projectId, fd);
      onChanged();
    } catch {
      setError('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId) => {
    setDeleting(fileId);
    setError('');
    try {
      await deleteProjectFile(projectId, fileId);
      onChanged();
    } catch {
      setError('שגיאה במחיקת הקובץ');
    } finally {
      setDeleting(null);
    }
  };

  const addFolder = () => {
    const name = customFolder.trim();
    if (!name) return;
    setFolder(name);
    setCustomFolder('');
    setShowNewFolder(false);
  };

  // Group files by folder
  const grouped = files.reduce((acc, f) => {
    const key = f.folderName || 'כללי';
    (acc[key] = acc[key] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Upload panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">העלאת קובץ</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">תיקייה</label>
            {showNewFolder ? (
              <div className="flex gap-2">
                <input type="text" value={customFolder} onChange={(e) => setCustomFolder(e.target.value)}
                  placeholder="שם תיקייה חדשה" className={`${inputCls} flex-1`} />
                <button type="button" onClick={addFolder}
                  className="px-3 py-2 bg-primary text-white text-xs rounded-lg">הוסף</button>
                <button type="button" onClick={() => setShowNewFolder(false)}
                  className="px-2 py-2 text-gray-400 hover:text-gray-600 text-xs">ביטול</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={folder} onChange={(e) => setFolder(e.target.value)} className={`${inputCls} flex-1`}>
                  {existingFolders.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewFolder(true)}
                  className="text-xs text-primary hover:text-primary-dark whitespace-nowrap">+ תיקייה חדשה</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">קובץ</label>
            <label className={`flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-500">{uploading ? 'מעלה...' : 'בחר קובץ להעלאה'}</span>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* File list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-400">אין מסמכים עדיין</p>
        </div>
      ) : (
        Object.entries(grouped).map(([folderName, folderFiles]) => (
          <div key={folderName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">{folderName}</span>
              <span className="text-xs text-gray-400">({folderFiles.length})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {folderFiles.map((f) => (
                <div key={f.fileId} className="flex items-center gap-3 px-5 py-3">
                  <FileIcon fileType={f.fileType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                    <p className="text-xs text-gray-400">{f.fileType}</p>
                  </div>
                  <a href={f.path} target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:text-primary-dark">פתח</a>
                  <button type="button" onClick={() => handleDelete(f.fileId)}
                    disabled={deleting === f.fileId}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
