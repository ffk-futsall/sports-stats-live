// ============================================================
// Klient i të dhënave — MongoDB Atlas (nëpërmjet /api/data, /api/visitors,
// /api/notifications si funksione Vercel Serverless).
// ------------------------------------------------------------
// I gjithë state-i i aplikacionit ruhet si NJË dokument i vetëm në
// koleksionin "app_data" (key: 'main'). Çdo shtim/ndryshim/fshirje bën:
//   1) GET /api/data  ? merr kopjen më të freskët nga serveri
//   2) ndryshon array-in përkatës lokalisht
//   3) PUT /api/data  ? ruan GJITHË dokumentin e përditësuar
// Kjo siguron që "shto ? refresh" TË MOS humbasë kurrë të dhëna, sepse
// çdo shkrim shkon vërtet te MongoDB (jo te një URL placeholder që s'ekziston).
// Emrat e eksportuar janë njësoj si më parë, që asnjë skedar tjetër
// (DataContext, faqet admin) të mos ketë nevojë të ndryshojë import-et.
// ============================================================
import { supabaseClient } from './supabaseClient';
import {
  Season, Competition, Team, Player, Match, Goal, Scorer, PlayerOfWeek,
  User, AppSettings, Decision, ShortiRubrik,
} from '@/types';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: await authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `GET ${path} dështoi (${res.status})`);
  }
  return res.json();
}

async function apiSend(method: 'POST' | 'PUT', path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${method} ${path} dështoi (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

// ============ THE SINGLE BLOB (fetch-mutate-write) ============

const BLOB_DEFAULTS: Record<string, any> = {
  seasons: [], competitions: [], teams: [], players: [], matches: [], goals: [],
  scorers: [], playersOfWeek: [], users: [], decisions: [], videos: [], news: [],
  settings: { appName: 'FFK Futsall', logo: '', contact: 'info@ffk-futsall.com' },
  shortiSuperliga: [], shortiLigaPare: [],
  nationalPlayers: [], nationalMatches: [], nationalStaff: [],
  ntCompetitions: [], ntGroups: [], ntGroupTeams: [], ntGroupMatches: [], ntActivities: [],
  ffkMoments: [], liveStreams: [], playoffSeries: [], playoffMatches: [],
};

/**
 * E rëndësishme: gjithmonë marrim kopjen më të fundit nga serveri PARA se të
 * ndryshojmë diçka (jo një kopje lokale të "ndenjur"), që dy admin që punojnë
 * njëkohësisht të mos fshijnë ndryshimet e njëri-tjetrit.
 */
// RADHA E SHKRIMEVE (write queue): nëse admin-i shton disa skuadra shpejt
// njëra pas tjetrës, çdo mutateBlob() do të priste në radhë derisa i
// mëparshmi të MBAROJË plotësisht (GET + PUT), në vend që të "garojnë" — kjo
// eliminon rastin kur shtimi #2 fillon GET-in e vet PARA se shtimi #1 të ketë
// mbaruar PUT-in, gjë që më parë bënte që #2 të mbishkruante mbi #1 (skuadra
// "humbur" e heshtur).
let _writeQueue: Promise<void> = Promise.resolve();

async function mutateBlob(mutator: (blob: Record<string, any>) => void): Promise<void> {
  const run = async () => {
    const fresh = await apiGet('/data');
    const blob = { ...BLOB_DEFAULTS, ...fresh };
    mutator(blob);
    await apiSend('PUT', '/data', blob);
  };
  const result = _writeQueue.then(run, run);
  // Mbaje radhën "të gjallë" edhe nëse ky shkrim dështon — shkrimet e tjera
  // në radhë duhet të vazhdojnë; gabimi ende del te thirrësi i mutateBlob.
  _writeQueue = result.catch(() => {});
  return result;
}

// ============ FETCH ALL DATA (ngarkimi fillestar) ============

export async function fetchAllData() {
  const blob = await apiGet('/data');
  const merged = { ...BLOB_DEFAULTS, ...blob };
  return {
    seasons: merged.seasons as Season[],
    competitions: merged.competitions as Competition[],
    teams: merged.teams as Team[],
    players: merged.players as Player[],
    matches: merged.matches as Match[],
    goals: merged.goals as Goal[],
    scorers: merged.scorers as Scorer[],
    playersOfWeek: merged.playersOfWeek as PlayerOfWeek[],
    users: merged.users as User[],
    decisions: merged.decisions as Decision[],
    settings: merged.settings as AppSettings,
    shortiSuperliga: merged.shortiSuperliga as ShortiRubrik[],
    shortiLigaPare: merged.shortiLigaPare as ShortiRubrik[],
    nationalPlayers: [] as any[],
    nationalMatches: [] as any[],
  };
}

// ============ GENERIC CRUD BUILDERS (mbi "blob"-in e vetëm) ============

function makeUpsertCrud(arrKey: string) {
  return {
    getAll: async () => {
      const blob = await apiGet('/data');
      return (blob[arrKey] || []) as any[];
    },
    upsert: async (item: any) => {
      await mutateBlob(blob => {
        const arr = blob[arrKey] || [];
        const exists = arr.some((x: any) => x.id === item.id);
        blob[arrKey] = exists ? arr.map((x: any) => (x.id === item.id ? { ...x, ...item } : x)) : [...arr, item];
      });
      return item;
    },
    remove: async (id: string) => {
      await mutateBlob(blob => {
        blob[arrKey] = (blob[arrKey] || []).filter((x: any) => x.id !== id);
      });
      return true;
    },
  };
}

// ============ "CORE" ENTITETET (seasons, teams, matches, etj.) ============
// KJO ËSHTË TASHMË RRUGA E VETME (autoritative) drejt MongoDB. Çdo add/update/
// delete: (1) merr kopjen MË TË FUNDIT nga serveri, (2) ndryshon VETËM array-in
// përkatës, (3) shkruan gjithë dokumentin mbrapsht. Kjo eliminon bug-un ku një
// tab i hapur prej kohësh shkruan mbi shtesat e reja të bëra nga dikush tjetër
// ndërkohë — dritarja e "garës" tani është vetëm koha e një kërkese rrjeti,
// jo sa ka qëndruar hapur browser-i.
function makeSimpleCrud<T extends { id: string }>(arrKey: string) {
  return {
    add: async (item: T) => {
      await mutateBlob(blob => {
        const arr: T[] = blob[arrKey] || [];
        // Mbrojtje shtesë kundër dublikimit nëse thirret dy herë (p.sh. retry).
        blob[arrKey] = arr.some(x => x.id === item.id) ? arr.map(x => (x.id === item.id ? item : x)) : [...arr, item];
      });
      return true;
    },
    update: async (item: T) => {
      await mutateBlob(blob => {
        blob[arrKey] = (blob[arrKey] || []).map((x: any) => (x.id === item.id ? item : x));
      });
      return true;
    },
    delete: async (id: string) => {
      await mutateBlob(blob => {
        blob[arrKey] = (blob[arrKey] || []).filter((x: any) => x.id !== id);
      });
      return true;
    },
  };
}

// ============ SEASONS ============
export const dbSeasons = {
  ...makeSimpleCrud<Season>('seasons'),
  deactivateAll: async () => {
    try {
      await mutateBlob(blob => {
        blob.seasons = (blob.seasons || []).map((s: any) => ({ ...s, isActive: false }));
      });
    } catch (e) {
      console.error('Deactivate seasons error:', e);
    }
  },
};

// ============ COMPETITIONS / TEAMS / PLAYERS / MATCHES ============
export const dbCompetitions = makeSimpleCrud<Competition>('competitions');
export const dbTeams = makeSimpleCrud<Team>('teams');
export const dbPlayers = makeSimpleCrud<Player>('players');
export const dbMatches = makeSimpleCrud<Match>('matches');

// ============ GOALS ============
export const dbGoals = {
  add: async (g: Goal) => {
    await mutateBlob(blob => {
      const arr: Goal[] = blob.goals || [];
      blob.goals = arr.some((x: any) => x.id === g.id) ? arr : [...arr, g];
    });
    return true;
  },
  delete: async (id: string) => {
    await mutateBlob(blob => { blob.goals = (blob.goals || []).filter((x: any) => x.id !== id); });
    return true;
  },
};

// ============ SCORERS / PLAYER OF WEEK / USERS / DECISIONS ============
export const dbScorers = makeSimpleCrud<Scorer>('scorers');
export const dbPlayerOfWeek = makeSimpleCrud<PlayerOfWeek>('playersOfWeek');
export const dbUsers = makeSimpleCrud<User>('users');
export const dbDecisions = makeSimpleCrud<Decision>('decisions');

// ============ SETTINGS ============
export const dbSettings = {
  update: async (settings: AppSettings) => {
    await mutateBlob(blob => { blob.settings = settings; });
  },
};

// ============ SHORTI (DRAW) ============
export const dbShorti = {
  async update(key: 'shorti_superliga' | 'shorti_liga_pare', value: ShortiRubrik[]) {
    try {
      const field = key === 'shorti_superliga' ? 'shortiSuperliga' : 'shortiLigaPare';
      await mutateBlob(blob => { blob[field] = value; });
      return true;
    } catch (e) {
      console.error('Shorti update error:', e);
      return false;
    }
  },
};

// ============ FILE UPLOAD (Supabase Storage bucket media) ============
async function uploadToMediaBucket(file, folder, id) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = folder + '/' + id + '-' + Date.now() + '.' + ext;
  const { error } = await supabaseClient.storage
    .from('media')
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadTeamLogo(file, teamId) {
  return uploadToMediaBucket(file, 'team-logos', teamId);
}

export async function uploadPlayerPhoto(file, playerId) {
  return uploadToMediaBucket(file, 'player-photos', playerId);
}

// ============ POLLING-BASED "REAL-TIME" (emulon Supabase Realtime) ============
// RISHIKUAR PËR BANDWIDTH: më parë çdo "subscribe" (matches, goals, dhe 8
// tabela të tjera) fillonte TIMER-in E VET, secili duke shkarkuar GJITHË
// dokumentin (/api/data) — përfshi çdo foto/logo si base64 — çdo 4-8 sekonda,
// PËR ÇDO vizitor. Kjo shkaktoi ~52GB trafik brenda muajit dhe pezullimin e
// projektit në Vercel. Tani:
//   • matches/goals përdorin /api/live (projeksion i lehtë, PA foto) dhe
//     interval më të gjatë (8s).
//   • 8 "tabelat" e tjera (teams, players, etj.) ndajnë NJË poller të
//     vetëm, që bën NJË fetch të plotë çdo 45s (jo 8 fetch të veçanta çdo 8s).

function diffAndEmit(arrKey: string, rows: any[], prevMaps: Map<string, Map<string, any>>, callback: (payload: any) => void, isFirst: boolean) {
  const prevMap = prevMaps.get(arrKey) || new Map<string, any>();
  const newMap = new Map(rows.map(r => [r.id, r]));
  if (!isFirst) {
    for (const [id, oldRow] of prevMap) {
      if (!newMap.has(id)) callback({ eventType: 'DELETE', new: null, old: oldRow });
    }
    for (const [id, newRow] of newMap) {
      const oldRow = prevMap.get(id);
      if (!oldRow) callback({ eventType: 'INSERT', new: newRow, old: null });
      else if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) callback({ eventType: 'UPDATE', new: newRow, old: oldRow });
    }
  }
  prevMaps.set(arrKey, newMap);
}

// --- E shpejtë (matches/goals): endpoint i lehtë, pa foto ---
function pollLightField(arrKey: string, callback: (payload: any) => void, intervalMs: number) {
  const prevMaps = new Map<string, Map<string, any>>();
  let first = true;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const rows: any[] = await apiGet(`/live?field=${arrKey}`);
      diffAndEmit(arrKey, rows || [], prevMaps, callback, first);
      first = false;
    } catch { /* transient network hiccup — provo sërish në tick-un tjetër */ }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return { unsubscribe() { stopped = true; clearInterval(timer); } };
}

// --- E ngadaltë (teams, players, etj.): NJË fetch i ndarë mes gjithë tabelave ---
type SlowListener = { arrKey: string; callback: (payload: any) => void };
const _slowListeners: SlowListener[] = [];
const _slowPrevMaps = new Map<string, Map<string, any>>();
let _slowFirst = true;
let _slowTimer: any = null;

async function slowPollTick() {
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    const blob = await apiGet('/data');
    for (const { arrKey, callback } of _slowListeners) {
      diffAndEmit(arrKey, blob[arrKey] || [], _slowPrevMaps, callback, _slowFirst);
    }
    _slowFirst = false;
  } catch { /* transient network hiccup */ }
}

function ensureSlowPolling() {
  if (_slowTimer) return;
  slowPollTick();
  _slowTimer = setInterval(slowPollTick, 120000); // rritur nga 45s ne 2 min per te kursyer egress
}

function subscribeSlowField(arrKey: string, callback: (payload: any) => void) {
  ensureSlowPolling();
  const entry: SlowListener = { arrKey, callback };
  _slowListeners.push(entry);
  return {
    unsubscribe() {
      const idx = _slowListeners.indexOf(entry);
      if (idx !== -1) _slowListeners.splice(idx, 1);
      if (_slowListeners.length === 0 && _slowTimer) {
        clearInterval(_slowTimer);
        _slowTimer = null;
        _slowFirst = true;
      }
    },
  };
}

const TABLE_TO_BLOB_KEY: Record<string, string> = {
  seasons: 'seasons', competitions: 'competitions', teams: 'teams', players: 'players',
  scorers: 'scorers', player_of_week: 'playersOfWeek', users: 'users', decisions: 'decisions',
};

export function subscribeToMatches(callback: (payload: any) => void) {
  return pollLightField('matches', callback, 15000);
}

export function subscribeToGoals(callback: (payload: any) => void) {
  return pollLightField('goals', callback, 15000);
}

export function subscribeToTable(table: string, callback: (payload: any) => void) {
  return subscribeSlowField(TABLE_TO_BLOB_KEY[table] || table, callback);
}

// ============ NOTIFICATIONS (cross-client, bazuar në polling) ============
type NotifCallback = (payload: any) => void;
const _notifListeners = new Map<string, NotifCallback[]>();
let _notifPollStarted = false;
let _notifLastTs = new Date().toISOString();

function ensureNotificationPolling() {
  if (_notifPollStarted) return;
  _notifPollStarted = true;
  const tick = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const items: any[] = await apiGet(`/notifications?since=${encodeURIComponent(_notifLastTs)}`);
      items.forEach(n => {
        if (n.createdAt && n.createdAt > _notifLastTs) _notifLastTs = n.createdAt;
        (_notifListeners.get(n.event) || []).forEach(cb => cb(n.payload));
      });
    } catch { /* ignore, retry next tick */ }
  };
  tick();
  setInterval(tick, 20000); // rritur nga 2.5s ne 20s per te kursyer egress
}

export function getNotificationChannel() {
  ensureNotificationPolling();
  return { unsubscribe() {} };
}

export function broadcastNotification(event: string, payload: any) {
  apiSend('POST', '/notifications', { event, payload }).catch(e => console.error('broadcastNotification failed:', e));
}

export function onNotification(event: string, callback: NotifCallback) {
  ensureNotificationPolling();
  const list = _notifListeners.get(event) || [];
  list.push(callback);
  _notifListeners.set(event, list);
  return {
    unsubscribe() {
      _notifListeners.set(event, (_notifListeners.get(event) || []).filter(cb => cb !== callback));
    },
  };
}

// ============ VIDEOS / NEWS ============
export const dbVideos = makeUpsertCrud('videos');
export const dbNews = makeUpsertCrud('news');

// ============ VISITORS ============
export const dbVisitors = {
  async track() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const geo = await res.json();
      await apiSend('POST', '/visitors', {
        ip: geo.ip || 'unknown',
        city: geo.city || 'unknown',
        region: geo.region || '',
        country: geo.country_name || '',
        visited_at: new Date().toISOString(),
        user_agent: navigator.userAgent.substring(0, 200),
      });
    } catch (e) {
      console.error('Visitor tracking failed:', e);
    }
  },
  async getAll() { try { return await apiGet('/visitors'); } catch { return []; } },
  async getStats() {
    try { return await apiGet('/visitors?stats=1'); }
    catch { return { total: 0, unique: 0, today: 0, uniqueToday: 0, recent: [] }; }
  },
};

// ============ NATIONAL TEAM (legacy — jo aktualisht të përdorura nga UI) ============
export const dbNationalPlayers = makeUpsertCrud('nationalPlayers');
export const dbNationalMatches = makeUpsertCrud('nationalMatches');
export const dbNationalStaff = makeUpsertCrud('nationalStaff');

// ============ NT COMPETITIONS & GROUPS ============
export const dbNtCompetitions = makeUpsertCrud('ntCompetitions');
export const dbNtGroups = makeUpsertCrud('ntGroups');
export const dbNtGroupTeams = makeUpsertCrud('ntGroupTeams');
export const dbNtGroupMatches = makeUpsertCrud('ntGroupMatches');

// ============ NT ACTIVITIES ============
export const dbNtActivities = makeUpsertCrud('ntActivities');

// ============ FFK FUTSAL MOMENTS ============
export const dbFfkMoments = makeUpsertCrud('ffkMoments');

// ============ LIVE STREAMS ============
export const dbLiveStreams = makeUpsertCrud('liveStreams');

// ============ PLAYOFF ============
export const dbPlayoffSeries = makeUpsertCrud('playoffSeries');
export const dbPlayoffMatches = makeUpsertCrud('playoffMatches');

// ============ NORMATIVE ACTS (endpoint i veçantë — PDF base64 shumë i madh për blob kryesor) ============
export const dbNormativeActs = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/normative-acts`);
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },
  upsert: async (item: any) => {
    const res = await fetch(`${API_BASE}/normative-acts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders() },
      body: JSON.stringify(item),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'normative-acts upsert failed'); }
    return item;
  },
  remove: async (id: string) => {
    const res = await fetch(`${API_BASE}/normative-acts?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: await authHeaders() });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'normative-acts remove failed'); }
    return true;
  },
};







// ============ MATCH VOTES ============
export const dbVotes = {
  getCounts: async (matchId: string) => {
    const res = await fetch(`${API_BASE}/votes?matchId=${encodeURIComponent(matchId)}`);
    if (!res.ok) return { home: 0, draw: 0, away: 0 };
    return res.json();
  },
  vote: async (matchId: string, choice: 'home' | 'draw' | 'away', voterId: string) => {
    const res = await fetch(`${API_BASE}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, choice, voterId }),
    });
    if (!res.ok) throw new Error('Vote failed');
    return res.json();
  },
};

