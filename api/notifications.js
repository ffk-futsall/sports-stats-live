import { requireAdmin } from './_adminAuth.js';
import { supabase } from './_supabaseClient.js';

const NOTIF_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    const { event, payload } = req.body || {};
    if (!event) {
      res.status(400).json({ error: 'Mungon "event"' });
      return;
    }
    try {
      const { error } = await supabase.from('notifications')
        .insert({ event, payload: payload || {}, created_at: new Date().toISOString() });
      if (error) throw error;

      const cutoff = new Date(Date.now() - NOTIF_MAX_AGE_MS).toISOString();
      supabase.from('notifications').delete().lt('created_at', cutoff).then(() => {});

      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const since = req.query.since || new Date(0).toISOString();
      const { data: docs, error } = await supabase.from('notifications')
        .select('event, payload, created_at')
        .gt('created_at', since)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      res.status(200).json(docs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
