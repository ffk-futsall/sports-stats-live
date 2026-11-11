import { requireAdmin } from './_adminAuth.js';
import { supabase } from './_supabaseClient.js';

const ALLOWED_FIELDS = ['ip', 'city', 'region', 'country', 'visited_at'];

function pickAllowed(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const payload = pickAllowed(req.body || {});
      payload.visited_at = payload.visited_at || new Date().toISOString();
      const { error } = await supabase.from('visitors').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'GET') {
    if (!await requireAdmin(req, res)) return;
    try {
      const { data: all, error } = await supabase
        .from('visitors').select('*').order('visited_at', { ascending: false }).limit(500);
      if (error) throw error;
      if (req.query.stats) {
        const today = new Date().toISOString().split('T')[0];
        const todayV = all.filter((v) => (v.visited_at || '').startsWith(today));
        const uniqueIPs = new Set(all.map((v) => v.ip));
        const uniqueToday = new Set(todayV.map((v) => v.ip));
        res.status(200).json({
          total: all.length,
          unique: uniqueIPs.size,
          today: todayV.length,
          uniqueToday: uniqueToday.size,
          recent: all.slice(0, 50),
        });
        return;
      }
      res.status(200).json(all);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
