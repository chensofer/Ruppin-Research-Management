import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const RESEARCHER_NAV = [
  {
    to: '/dashboard',
    label: 'רשימת מחקרים',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/approvals',
    label: 'אישורים ממתינים',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/my-reports',
    label: 'הדוחות שלי',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const profilePic = user?.userId
    ? localStorage.getItem(`profilePic_${user.userId}`)
    : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() ||
    (user?.userId?.[0] ?? '?').toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #003478 0%, #001E50 100%)' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-center border-b border-white/10">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5" dir="rtl">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-1">
          {/* Avatar */}
          <button
            onClick={() => { navigate('/profile'); setMobileOpen(false); }}
            className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20 hover:ring-accent/70 transition-all"
            title="הפרופיל שלי"
          >
            {profilePic ? (
              <img src={profilePic} alt="פרופיל" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            )}
          </button>

          {/* Name */}
          <button
            onClick={() => { navigate('/profile'); setMobileOpen(false); }}
            className="flex-1 min-w-0 text-right hover:opacity-80 transition-opacity"
            title="הפרופיל שלי"
          >
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-white/45 truncate mt-0.5">{user?.userId}</p>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="התנתקות"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-page-bg" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Right Sidebar */}
      <aside
        className={`
          fixed right-0 top-0 h-full z-30 w-64 flex flex-col shadow-sidebar
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-10 bg-sidebar-bg shadow-md flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(90deg, #001E50 0%, #003478 100%)' }}>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
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
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
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
