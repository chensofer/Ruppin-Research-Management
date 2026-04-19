import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const RESEARCHER_NAV = [
  {
    to: '/dashboard',
    label: 'רשימת מחקרים',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/approvals',
    label: 'אישורים ממתינים',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const ASSISTANT_NAV = [
  {
    to: '/attendance',
    label: 'דיווח נוכחות',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/my-reports',
    label: 'הדוחות שלי',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.systemAuthorization === 'עוזר מחקר' ? ASSISTANT_NAV : RESEARCHER_NAV;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.firstName?.[0] || user?.userId?.[0] || '?';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-center">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { navigate('/profile'); setMobileOpen(false); }}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 hover:opacity-80 transition-opacity"
            title="הפרופיל שלי"
          >
            {initials}
          </button>
          <button
            onClick={() => { navigate('/profile'); setMobileOpen(false); }}
            className="flex-1 min-w-0 text-right hover:opacity-80 transition-opacity"
            title="הפרופיל שלי"
          >
            <p className="text-sm font-medium text-gray-800 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.userId}</p>
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="התנתקות"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-page-bg" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Right Sidebar — fixed on desktop, slide-in on mobile */}
      <aside
        className={`
          fixed right-0 top-0 h-full z-30 w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 shadow-sm">
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="התנתקות"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <Logo size="xs" />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          title="תפריט"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8 min-h-screen pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
