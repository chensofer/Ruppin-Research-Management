import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import {
  HiSquares2X2, HiCheckCircle, HiCalendarDays, HiDocumentChartBar,
  HiArrowRightOnRectangle, HiBars3, HiChartBar, HiArchiveBox,
  HiSun, HiMoon, HiClock, HiUserGroup, HiLightBulb, HiBell,
} from 'react-icons/hi2';
import { getPendingPaymentRequests } from '../api/paymentRequestsApi';
import { getPendingHourApprovals } from '../api/hourReportsApi';
import { getMyNotifications, markNotificationRead, markAllRead } from '../api/notificationsApi';

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
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen]         = useState(false);

  const role = user?.systemAuthorization;
  const isAssistant  = role === 'עוזר מחקר';
  const isSecretary  = role === 'מזכירות';
  const isResearcher = !isAssistant;

  const RESEARCHER_NAV = [
    { to: '/dashboard',   label: 'רשימת מחקרים',        icon: <HiSquares2X2  className="w-5 h-5 flex-shrink-0" /> },
    { to: '/approvals',   label: 'אישורים ממתינים',      icon: <HiCheckCircle className="w-5 h-5 flex-shrink-0" />, badge: pendingCount },
    { to: '/comparison',  label: 'השוואות בין מחקרים',   icon: <HiChartBar    className="w-5 h-5 flex-shrink-0" />,
      customActive: () => location.pathname === '/comparison' && !location.search.includes('mode=recommendations') },
    { to: '/comparison?mode=recommendations', label: 'המלצות להעברת תקציב', icon: <HiLightBulb className="w-5 h-5 flex-shrink-0" />,
      customActive: () => location.pathname === '/comparison' && location.search.includes('mode=recommendations') },
    { to: '/archive',     label: 'ארכיון מחקרים',        icon: <HiArchiveBox  className="w-5 h-5 flex-shrink-0" /> },
  ];

  const SECRETARY_NAV = [
    { to: '/approvals',   label: 'אישורים ממתינים',      icon: <HiCheckCircle className="w-5 h-5 flex-shrink-0" />, badge: pendingCount },
    { to: '/history',     label: 'היסטוריית שינויים',    icon: <HiClock       className="w-5 h-5 flex-shrink-0" /> },
    { to: '/users',       label: 'ניהול משתמשים',        icon: <HiUserGroup   className="w-5 h-5 flex-shrink-0" /> },
  ];

  const navItems = isAssistant ? ASSISTANT_NAV : isSecretary ? SECRETARY_NAV : RESEARCHER_NAV;

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
    if (isAssistant || !user?.userId) return;

    const fetchCount = () => {
      if (location.pathname === '/approvals') return;
      Promise.all([
        getPendingPaymentRequests().catch(() => ({ data: [] })),
        getPendingHourApprovals(user.userId).catch(() => ({ data: [] })),
      ]).then(([pRes, hRes]) => {
        const pendingPayments = (pRes.data ?? []).filter(r => r.status === 'ממתין').length;
        setPendingCount(pendingPayments + (hRes.data?.length ?? 0));
      });
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    window.addEventListener('focus', fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchCount);
    };
  }, [user, isAssistant, location.pathname]);

  // טעינת התראות — בעת כניסה לאתר ובכל פוקוס חלון (רק לחוקרים)
  const firstNotifLoad = useRef(true);
  useEffect(() => {
    if (isAssistant || !user?.userId) return;
    const fetchNotifs = (autoOpen = false) =>
      getMyNotifications()
        .then(r => {
          const items = r.data ?? [];
          setNotifications(items);
          // פתח אוטומטית את פאנל ההתראות בכניסה הראשונה אם יש התראות
          if (autoOpen && items.length > 0) setNotifOpen(true);
        })
        .catch(() => {});
    fetchNotifs(firstNotifLoad.current);
    firstNotifLoad.current = false;
    window.addEventListener('focus', fetchNotifs);
    return () => window.removeEventListener('focus', fetchNotifs);
  }, [user, isAssistant]);


  const handleMarkRead = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.notificationId !== id));
  };

  const handleMarkAllRead = async () => {
    await markAllRead().catch(() => {});
    setNotifications([]);
    setNotifOpen(false);
  };

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
            key={item.label}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => {
              const active = item.customActive ? item.customActive() : isActive;
              return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`;
            }}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {/* Pending badge */}
            {item.badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center leading-none">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Notifications bell — only the button lives here; the dropdown panel is rendered outside SidebarContent to avoid remount issues */}
      {!isAssistant && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-white/65 hover:bg-white/10 hover:text-white"
          >
            <div className="relative">
              <HiBell className="w-5 h-5 flex-shrink-0" />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </div>
            <span className="flex-1 text-right">התראות</span>
          </button>
        </div>
      )}

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
              <div className="w-full h-full bg-accent flex items-center justify-center text-white font-bold text-sm">
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
            <p className="text-sm text-white/45 truncate mt-0.5">{user?.userId}</p>
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

      {/* Notifications dropdown — fixed panel next to sidebar, rendered here to avoid SidebarContent remount issues */}
      {notifOpen && !isAssistant && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div
            className="fixed right-64 bottom-20 w-80 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100"
            dir="rtl"
          >
            <div className="bg-purple-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">🔔 {notifications.length > 0 ? `${notifications.length} התראות חדשות` : 'התראות'}</p>
                {notifications.length > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-purple-200 hover:text-white underline">
                    סמן הכל כנקרא
                  </button>
                )}
              </div>
              {notifications.length > 0 && (
                <p className="text-xs text-purple-200 mt-0.5">קיבלת בקשות העברת תקציב הממתינות לטיפולך</p>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-2xl mb-1">🔕</p>
                <p className="text-sm text-gray-400">אין התראות חדשות</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.map(n => {
                  let parsed = null;
                  try { parsed = JSON.parse(n.data); } catch {}
                  const dateStr = n.createdAt && !n.createdAt.endsWith('Z') ? n.createdAt + 'Z' : n.createdAt;
                  return (
                    <div key={n.notificationId} className="px-4 py-3 bg-purple-50/40 hover:bg-purple-50 transition-colors">
                      <p className="text-xs font-semibold text-purple-700 mb-0.5">💸 בקשת העברת תקציב</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                      {parsed && (
                        <button
                          onClick={() => {
                            handleMarkRead(n.notificationId);
                            setNotifOpen(false);
                            navigate(`/projects/${parsed.giverProjectId}?tab=transfer&to=${parsed.receiverProjectId}&amount=${Math.round(parsed.amount)}`);
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          💸 בצע העברה
                        </button>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {new Date(dateStr).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button
                          onClick={() => handleMarkRead(n.notificationId)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          סמן כנקרא
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8 min-h-screen pt-16 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
