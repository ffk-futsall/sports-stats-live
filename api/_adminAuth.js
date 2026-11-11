import { supabase } from './_supabaseClient.js';

// Always verify the bearer token with Supabase, then check the server-managed
// allowlist. Neither JWT user metadata nor client-supplied roles grant access.
export async function requireAdmin(req, res) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) { res.status(401).json({ error: 'Autentikimi kërkohet' }); return null; }
  try {
    const { data, error } = await supabase.auth.getUser(match[1]);
    const user = data?.user;
    if (error || !user || !user.email_confirmed_at) {
      res.status(401).json({ error: 'Sesioni është i pavlefshëm' }); return null;
    }
    const { data: admin, error: lookupError } = await supabase
      .from('admin_accounts').select('user_id').eq('user_id', user.id).maybeSingle();
    if (lookupError) { res.status(503).json({ error: 'Verifikimi nuk është i disponueshëm' }); return null; }
    if (!admin) { res.status(403).json({ error: 'Nuk keni qasje administrative' }); return null; }
    return user;
  } catch {
    res.status(503).json({ error: 'Verifikimi nuk është i disponueshëm' }); return null;
  }
}
