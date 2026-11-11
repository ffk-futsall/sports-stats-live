import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabaseClient } from '@/lib/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthenticated: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    localStorage.removeItem('ffk_auth_user');
    let active = true;
    let sequence = 0;
    const verify = async (token?: string) => {
      const n = ++sequence;
      if (!token) { if (active) { setCurrentUser(null); setLoading(false); } return; }
      try {
        const res = await fetch('/api/admin-session', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const user = res.ok ? await res.json() : null;
        if (active && n === sequence) setCurrentUser(user ? { id: user.id, username: user.email, password: '', role: 'admin' } : null);
      } catch { if (active && n === sequence) setCurrentUser(null); }
      finally { if (active && n === sequence) setLoading(false); }
    };
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      // Do not await Supabase methods inside this callback.
      void verify(session?.access_token);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) return false;
    const res = await fetch('/api/admin-session', { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store' }).catch(() => null);
    if (!res?.ok) { await supabaseClient.auth.signOut(); return false; }
    const user = await res.json();
    setCurrentUser({ id: user.id, username: user.email, password: '', role: 'admin' });
    return true;
  };
  const logout = () => { setCurrentUser(null); void supabaseClient.auth.signOut(); };
  return <AuthContext.Provider value={{ currentUser, login, logout, loading, isAdmin: !!currentUser, isEditor: false, isAuthenticated: !!currentUser }}>{children}</AuthContext.Provider>;
};
