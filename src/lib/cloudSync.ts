// Sinkronizon të dhënat që më parë ishin vetëm në localStorage me Supabase (/api/local-data).
//  - në nisje: merr kopjen nga cloud dhe e vendos në localStorage (cloud ka përparësi)
//  - kur admini ruan një nga çelësat: dërgohet automatikisht në cloud
//  - çelësat që ekzistojnë vetëm lokalisht dërgohen në cloud kur admini është i kyçur
import { supabaseClient } from './supabaseClient';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api';
export const CLOUD_KEYS = ['ffk_player_stats', 'ffk_officials', 'ffk_match_sheets', 'ffk_club_documents', 'komisioni_vendimet'];

const rawSet = Storage.prototype.setItem;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

async function token(): Promise<string | null> {
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token || null;
  } catch { return null; }
}

async function push(records: Record<string, unknown[]>) {
  const t = await token();
  if (!t) return false;
  try {
    const res = await fetch(`${API_BASE}/local-data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ records }),
    });
    return res.ok;
  } catch { return false; }
}

function readLocal(key: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}

export async function initCloudSync() {
  // 1) hook: çdo ruajtje e një çelësi të listuar shkon edhe në cloud
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    rawSet.call(this, key, value);
    if (this === localStorage && CLOUD_KEYS.includes(key)) {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        const v = readLocal(key);
        if (v) push({ [key]: v });
      }, 800);
    }
  };

  // 2) merr nga cloud
  let cloud: Record<string, unknown[]> = {};
  try {
    const res = await fetch(`${API_BASE}/local-data`, { cache: 'no-store' });
    if (res.ok) cloud = await res.json();
  } catch { /* offline: vazhdon me të dhënat lokale */ }
  for (const key of CLOUD_KEYS) {
    if (Array.isArray(cloud[key])) rawSet.call(localStorage, key, JSON.stringify(cloud[key]));
  }

  // 3) çka ekziston vetëm lokalisht dërgohet në cloud (vetëm nëse admini është i kyçur)
  const missing: Record<string, unknown[]> = {};
  for (const key of CLOUD_KEYS) {
    if (!Array.isArray(cloud[key])) {
      const v = readLocal(key);
      if (v && v.length) missing[key] = v;
    }
  }
  if (Object.keys(missing).length) push(missing);
}
