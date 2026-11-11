import { supabase, getAppData, DEFAULT_BLOB, invalidateCache } from './_supabaseClient.js';
import { requireAdmin } from './_adminAuth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await getAppData();
      res.setHeader('Cache-Control', 'no-store');
      const publicData = { ...DEFAULT_BLOB, ...data };
      delete publicData.users;
      res.status(200).json(publicData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!await requireAdmin(req, res)) return;
    try {
      const body = { ...req.body };
      delete body.users;
      const { error } = await supabase.from('app_data').upsert(
        { key: 'main', data: body, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      invalidateCache();
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
