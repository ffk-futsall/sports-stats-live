import { requireAdmin } from './_adminAuth.js';
import { supabase } from './_supabaseClient.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('app_data').select('data').eq('key', 'normative_acts').single();
      if (error && error.code !== 'PGRST116') throw error;
      res.status(200).json(data?.data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  if (req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    try {
      const item = req.body;
      const { data: existing } = await supabase
        .from('app_data').select('data').eq('key', 'normative_acts').single();
      const acts = existing?.data || [];
      const idx = acts.findIndex((a) => a.id === item.id);
      const updated = idx >= 0 ? acts.map((a) => (a.id === item.id ? { ...a, ...item } : a)) : [item, ...acts];
      const { error } = await supabase.from('app_data').upsert(
        { key: 'normative_acts', data: updated, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      res.status(200).json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  if (req.method === 'DELETE') {
    if (!await requireAdmin(req, res)) return;
    try {
      const { id } = req.query;
      const { data: existing } = await supabase
        .from('app_data').select('data').eq('key', 'normative_acts').single();
      const acts = (existing?.data || []).filter((a) => a.id !== id);
      const { error } = await supabase.from('app_data').upsert(
        { key: 'normative_acts', data: acts, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

