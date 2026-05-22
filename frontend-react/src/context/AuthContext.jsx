import { createContext, useContext, useState, useCallback } from 'react';

const AuthCtx = createContext(null);

const API = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kullanici') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const girisYap = useCallback(async (eposta, sifre) => {
    const res = await fetch(`${API}/api/auth/giris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eposta, sifre }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.hata || 'Giriş başarısız');
    localStorage.setItem('token', data.token);
    localStorage.setItem('kullanici', JSON.stringify(data.kullanici));
    setToken(data.token);
    setUser(data.kullanici);
    return data.kullanici;
  }, []);

  const cikisYap = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    setToken(null);
    setUser(null);
  }, []);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthCtx.Provider value={{ user, token, authHeader, girisYap, cikisYap, girisli: !!user }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
