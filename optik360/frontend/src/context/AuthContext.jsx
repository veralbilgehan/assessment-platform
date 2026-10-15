import React, { createContext, useCallback, useContext, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('o360_token') || null);
  const [user,  setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('o360_kullanici')); } catch { return null; }
  });

  const girisYap = useCallback(async (eposta, sifre) => {
    const res  = await fetch(`${API}/api/auth/giris`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ eposta, sifre }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.hata || 'Giriş başarısız');
    localStorage.setItem('o360_token', data.token);
    localStorage.setItem('o360_kullanici', JSON.stringify(data.kullanici));
    setToken(data.token);
    setUser(data.kullanici);
    return data.kullanici;
  }, []);

  const cikisYap = useCallback(() => {
    localStorage.removeItem('o360_token');
    localStorage.removeItem('o360_kullanici');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, token, girisYap, cikisYap, girisli: !!user }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() { return useContext(Ctx); }
