import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { uploadProjectFile, deleteProjectFile } from '../../api/projectsApi';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

// ── Folder storage via localStorage ──────────────────────────────────────────
const STORAGE_KEY = (projectId) => `project_folders_${projectId}`;

function loadSavedFolders(projectId) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(projectId))) ?? [];
  } catch {
    return [];
  }
}

function saveFolders(projectId, folders) {
  localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(folders));
}

// ── File type icon ────────────────────────────────────────────────────────────
function FileIcon({ fileType }) {
  const isImg = fileType?.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const isWord =
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword';
  const isExcel =
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel';

  let label = 'FILE';
  let cls = 'bg-gray-100 text-gray-500';
  if (isPdf)   { label = 'PDF';  cls = 'bg-red-100 text-red-600'; }
  if (isImg)   { label = 'IMG';  cls = 'bg-blue-100 text-blue-600'; }
  if (isWord)  { label = 'DOC';  cls = 'bg-indigo-100 text-indigo-600'; }
  if (isExcel) { label = 'XLS';  cls = 'bg-green-100 text-green-600'; }

  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${cls}`}>
      {label}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL');
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TabDocuments({ projectId, files, onChanged }) {
  // Build unified folder list: fixed default + localStorage + folders from existing files
  const [extraFolders, setExtraFolders] = useState(() => loadSavedFolders(projectId));
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Upload state
  const [selectedFolder, setSelectedFolder] = useState('כללי');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // All known folders = default + localStorage + from uploaded files
  const foldersFromFiles = [...new Set(files.map((f) => f.folderName).filter(Boolean))];
  const allFolders = [
    'כללי',
    ...new Set([...extraFolders, ...foldersFromFiles].filter((f) => f !== 'כללי')),
  ];

  // Persist localStorage whenever extraFolders changes
  useEffect(() => {
    saveFolders(projectId, extraFolders);
  }, [extraFolders, projectId]);

  // ── Create folder (no upload needed) ───────────────────────────────────────
  const handleCreateFolder = () => {
    const name = newFolderInput.trim();
    if (!name) return;
    if (allFolders.includes(name)) {
      toast.error('תיקייה בשם זה כבר קיימת');
      return;
    }
    setExtraFolders((prev) => [...prev, name]);
    setSelectedFolder(name);
    setNewFolderInput('');
    setShowNewFolder(false);
    toast.success(`התיקייה "${name}" נוצרה`);
  };

  // ── Upload file ─────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('folderName', selectedFolder);
    try {
      await uploadProjectFile(projectId, fd);
      setSelectedFile(null);
      toast.success('הקובץ הועלה בהצלחה');
      onChanged();
    } catch {
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete file ─────────────────────────────────────────────────────────────
  const handleDelete = async (fileId) => {
    setDeleting(fileId);
    try {
      await deleteProjectFile(projectId, fileId);
      toast.success('הקובץ נמחק');
      onChanged();
    } catch {
      toast.error('שגיאה במחיקת הקובץ');
    } finally {
      setDeleting(null);
    }
  };

  // ── Group files by folder ───────────────────────────────────────────────────
  const grouped = files.reduce((acc, f) => {
    const key = f.folderName || 'כללי';
    (acc[key] = acc[key] || []).push(f);
    return acc;
  }, {});

  // Show all known folders (even empty ones from localStorage)
  const displayFolders = [...new Set([...allFolders, ...Object.keys(grouped)])];

  return (
    <div className="space-y-4">

      {/* ── Upload & folder panel ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowNewFolder((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            + צור תיקייה
          </button>
          <h3 className="text-sm font-semibold text-gray-700">העלאת קובץ</h3>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="flex gap-2 items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <button
              type="button"
              onClick={() => { setShowNewFolder(false); setNewFolderInput(''); }}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={!newFolderInput.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
            >
              צור
            </button>
            <input
              type="text"
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="שם תיקייה חדשה..."
              className="flex-1 text-sm bg-transparent outline-none text-right placeholder-gray-400"
              autoFocus
            />
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
        )}

        {/* Folder + file selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">תיקייה</label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className={inputCls}
            >
              {allFolders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

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
              <input
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); e.target.value = ''; }}
              />
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
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading ? 'מעלה...' : 'העלה קובץ'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Folder list ── */}
      {displayFolders.length === 0 && files.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">אין מסמכים עדיין</p>
        </div>
      ) : (
        displayFolders.map((folderName) => {
          const folderFiles = grouped[folderName] ?? [];
          return (
            <div key={folderName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Folder header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">{folderName}</span>
                <span className="text-xs text-gray-400">
                  ({folderFiles.length} {folderFiles.length === 1 ? 'קובץ' : 'קבצים'})
                </span>
              </div>

              {/* File rows */}
              {folderFiles.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400 text-right">התיקייה ריקה — העלה קובץ לתיקייה זו</div>
              ) : (
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

                      {/* Open file in new tab */}
                      <a
                        href={f.path}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium whitespace-nowrap px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        פתח
                      </a>

                      {/* Download file */}
                      <a
                        href={f.path}
                        download={f.fileName}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        הורד
                      </a>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(f.fileId)}
                        disabled={deleting === f.fileId}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 rounded-lg hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
