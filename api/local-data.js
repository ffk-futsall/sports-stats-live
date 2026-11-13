import { requireAdmin } from './_adminAuth.js';
import { supabase } from './_supabaseClient.js';

// Të dhënat që më parë ruheshin vetëm në localStorage të shfletuesit.
// ffk_editors NUK përfshihet qëllimisht (mund të ketë fjalëkalime të vjetra).
const KEYS = ['ffk_player_stats', 'ffk_officials', 'ffk_match_sheets', 'ffk_club_documents', 'komisioni_vendimet'];
const ROW = 'local_data';
const MAX_BYTES = 3 * 1024 * 1024;

async function readAll() {
  const { data, error } = await supabase.from('app_data').select('data').eq('key', ROW).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.data && typeof data.data === 'object' ? data.data : {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      const all = await readAll();
      const out = {};
      for (const k of KEYS) if (Array.isArray(all[k])) out[k] = all[k];
      res.status(200).json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  if (req.method === 'PUT') {
    if (!await requireAdmin(req, res)) return;
    try {
      const body = req.body || {};
      const incoming = body.records && typeof body.records === 'object' ? body.records : (body.key ? { [body.key]: body.value } : {});
      const clean = {};
      for (const [k, v] of Object.entries(incoming)) {
        if (!KEYS.includes(k)) { res.status(400).json({ error: `Çelësi "${k}" nuk lejohet` }); return; }
        if (!Array.isArray(v)) { res.status(400).json({ error: `"${k}" duhet të jetë listë` }); return; }
        if (JSON.stringify(v).length > MAX_BYTES) { res.status(413).json({ error: `"${k}" është shumë i madh` }); return; }
        clean[k] = v;
      }
      if (!Object.keys(clean).length) { res.status(400).json({ error: 'Nuk ka të dhëna për ruajtje' }); return; }
      const merged = { ...(await readAll()), ...clean };
      const { error } = await supabase.from('app_data').upsert(
        { key: ROW, data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      res.status(200).json({ ok: true, saved: Object.keys(clean) });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
