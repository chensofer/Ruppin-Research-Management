import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// דגלי "התראה חד-פעמית לסשן" — מתאפסים רק בהתנתקות/כניסה מחדש, לא בכל רענון תגובה מהשרת
const SESSION_BADGE_KEYS = [
  'alerts_shown',
  'notif_panel_dismissed',
  'notif_badge_dismissed', 'notif_badge_count',
  'approvals_badge_dismissed', 'approvals_badge_count',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (authResponse) => {
    SESSION_BADGE_KEYS.forEach((k) => sessionStorage.removeItem(k));
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify({
      userId: authResponse.userId,
      firstName: authResponse.firstName,
      lastName: authResponse.lastName,
      systemAuthorization: authResponse.systemAuthorization,
    }));
    setUser({
      userId: authResponse.userId,
      firstName: authResponse.firstName,
      lastName: authResponse.lastName,
      systemAuthorization: authResponse.systemAuthorization,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    SESSION_BADGE_KEYS.forEach((k) => sessionStorage.removeItem(k));
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
