import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (authResponse) => {
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
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
