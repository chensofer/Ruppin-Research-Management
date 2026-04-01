import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../api/projectsApi';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch(() => setError('שגיאה בטעינת המחקרים'))
      .finally(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter(
    (p) => p.status === 'פעיל' || p.status === 'Active' || p.status === 'active'
  );

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.projectNameHe?.toLowerCase().includes(q) ||
      p.projectNameEn?.toLowerCase().includes(q) ||
      p.principalResearcherId?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          יצירת מחקר חדש
        </button>

        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900">רשימת מחקרים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeProjects.length} מחקרים פעילים</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם מחקר או חוקר..."
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 shadow-sm"
        />
        <svg
          className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Active projects section */}
      {!loading && !error && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <h2 className="text-sm font-semibold text-gray-700">
              מחקרים פעילים ({activeProjects.length})
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">לא נמצאו מחקרים</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((project) => (
                <ProjectCard key={project.projectId} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
