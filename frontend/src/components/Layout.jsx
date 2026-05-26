import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import {
  HiSquares2X2, HiCheckCircle, HiCalendarDays, HiDocumentChartBar,
  HiArrowRightOnRectangle, HiBars3, HiChartBar, HiArchiveBox,
  HiSun, HiMoon, HiClock,
} from 'react-icons/hi2';
import { getPendingPaymentRequests } from '../api/paymentRequestsApi';
import { getPendingHourApprovals } from '../api/hourReportsApi';

const ASSISTANT_NAV = [
  { to: '/attendance', label: 'דיווח נוכחות', icon: <HiCalendarDays      className="w-5 h-5 flex-shrink-0" /> },
  { to: '/my-reports', label: 'הדוחות שלי',   icon: <HiDocumentChartBar className="w-5 h-5 flex-shrink-0" /> },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [pendingCount, setPendingCount]   = useState(0);

  const isResearcher = user?.systemAuthorization !== 'עוזר מחקר';

  const RESEARCHER_NAV = [
    { to: '/dashboard',   label: 'רשימת מחקרים',        icon: <HiSquares2X2  className="w-5 h-5 flex-shrink-0" /> },
    { to: '/comparison',  label: 'השוואות בין מחקרים',   icon: <HiChartBar    className="w-5 h-5 flex-shrink-0" /> },
    { to: '/approvals',   label: 'אישורים ממתינים',      icon: <HiCheckCircle className="w-5 h-5 flex-shrink-0" />, badge: pendingCount },
    { to: '/archive',     label: 'ארכיון מחקרים',        icon: <HiArchiveBox  className="w-5 h-5 flex-shrink-0" /> },
    { to: '/history',     label: 'היסטוריית שינויים',    icon: <HiClock       className="w-5 h-5 flex-shrink-0" /> },
  ];

  const navItems = isResearcher ? RESEARCHER_NAV : ASSISTANT_NAV;

  const profilePic = user?.userId ? localStorage.getItem(`profilePic_${user.userId}`) : null;

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() ||
    (user?.userId?.[0] ?? '?').toUpperCase();

  // Clear badge when the user opens the approvals page
  useEffect(() => {
    if (location.pathname === '/approvals') setPendingCount(0);
  }, [location.pathname]);

  // Fetch pending approvals count — on mount, every 60s, and when window regains focus
  useEffect(() => {
    if (!isResearcher || !user?.userId) return;

    const fetchCount = () => {
      if (location.pathname === '/approvals') return;
      Promise.all([
        getPendingPaymentRequests().catch(() => ({ data: [] })),
        getPendingHourApprovals(user.userId).catch(() => ({ data: [] })),
      ]).then(([pRes, hRes]) => {
        setPendingCount((pRes.data?.length ?? 0) + (hRes.data?.length ?? 0));
      });
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    window.addEventListener('focus', fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchCount);
    };
  }, [user, isResearcher, location.pathname]);

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
            <span className="flex-1">{item.label}</span>
            {/* Pending badge */}
            {item.badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
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

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title={dark ? 'מצב יום' : 'מצב לילה'}
          >
            {dark ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="התנתקות"
          >
            <HiArrowRightOnRectangle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-page-bg" dir="rtl">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Right Sidebar */}
      <aside className={`fixed right-0 top-0 h-full z-30 w-64 flex flex-col shadow-sidebar transform transition-transform duration-200 ease-in-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-10 shadow-md flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(90deg, #001E50 0%, #003478 100%)' }}>
        {/* Hamburger — right side (first child in RTL) */}
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="תפריט">
          <HiBars3 className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/dashboard')} className="flex items-center">
          <Logo size="xs" />
        </button>
        {/* Logout — left side (last child in RTL) */}
        <button onClick={handleLogout} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all" title="התנתקות">
          <HiArrowRightOnRectangle className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8 min-h-screen pt-16 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
