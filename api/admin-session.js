import { requireAdmin } from './_adminAuth.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAdmin(req, res);
  if (user) { res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ id: user.id, email: user.email }); }
}
