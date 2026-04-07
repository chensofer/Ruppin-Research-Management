import { useState } from 'react';
import { uploadProjectFile, deleteProjectFile } from '../../api/projectsApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

function FileIcon({ fileType }) {
  const isImg = fileType?.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
      isPdf ? 'bg-red-100 text-red-600' : isImg ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
    }`}>
      {isPdf ? 'PDF' : isImg ? 'IMG' : 'FILE'}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL');
}

export default function TabDocuments({ projectId, files, onChanged }) {
  const [folder, setFolder] = useState('כללי');
  const [customFolder, setCustomFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  const existingFolders = ['כללי', ...new Set(files.map((f) => f.folderName).filter(Boolean).filter((f) => f !== 'כללי'))];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('folderName', folder);
    try {
      await uploadProjectFile(projectId, fd);
      setSelectedFile(null);
      onChanged();
    } catch {
      setError('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
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
          {/* Folder selector */}
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
                  className="text-xs text-primary hover:text-primary-dark whitespace-nowrap">+ תיקייה</button>
              </div>
            )}
          </div>

          {/* File picker */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">קובץ</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors min-w-0">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className={`text-sm truncate ${selectedFile ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {selectedFile ? selectedFile.name : 'בחר קובץ...'}
                </span>
              </div>
              <input type="file" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {selectedFile && (
            <button type="button" onClick={() => setSelectedFile(null)}
              className="text-xs text-gray-400 hover:text-gray-600">
              בטל בחירה
            </button>
          )}
          <div className="mr-auto">
            <button type="button" onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading ? 'מעלה...' : 'העלה קובץ'}
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
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
                <div key={f.fileId} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <FileIcon fileType={f.fileType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                    {f.createdDate && (
                      <p className="text-xs text-gray-400">{fmtDate(f.createdDate)}</p>
                    )}
                  </div>
                  <a href={f.path} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium whitespace-nowrap px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    פתח
                  </a>
                  <button type="button" onClick={() => handleDelete(f.fileId)}
                    disabled={deleting === f.fileId}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 rounded-lg hover:bg-red-50">
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
