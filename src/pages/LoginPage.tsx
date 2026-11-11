import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (await auth.login(email, password)) navigate('/admin');
      else setError('Kyçja dështoi. Kontrolloni të dhënat ose qasjen administrative.');
    } catch { setError('Kyçja nuk është e disponueshme. Provoni përsëri.'); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-[#F1F5F9]"><Header /><main className="flex justify-center px-4 py-16">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg space-y-5">
      <h1 className="text-2xl font-bold text-center">Kyçja e administratorit</h1>
      <label className="block text-sm">Email<input className="mt-1 w-full rounded-lg border p-3" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label className="block text-sm">Fjalëkalimi<input className="mt-1 w-full rounded-lg border p-3" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#0f1830] px-4 py-3 text-white disabled:opacity-50">{busy ? 'Duke u kyçur…' : 'Kyçu'}</button>
    </form></main></div>;
}
