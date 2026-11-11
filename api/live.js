import { getAppData } from './_supabaseClient.js';

const LIGHT_FIELDS = new Set([
  'matches', 'goals', 'seasons', 'competitions', 'scorers', 'playersOfWeek',  'decisions',
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const field = String(req.query.field || 'matches');
  if (!LIGHT_FIELDS.has(field)) {
    res.status(400).json({ error: `Fusha "${field}" nuk lejohet` });
    return;
  }

  try {
    const data = await getAppData();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data?.[field] || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
