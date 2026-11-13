import { requireAdmin } from './_adminAuth.js';
import { supabase } from './_supabaseClient.js';

let webpushPromise = null;
async function getWebPush() {
  if (!webpushPromise) {
    webpushPromise = import('web-push').then((m) => {
      const webpush = m.default || m;
      webpush.setVapidDetails('mailto:info@ffk-futsall.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      return webpush;
    });
  }
  return webpushPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!await requireAdmin(req, res)) return;
  const { title, body, url } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Mungon "title"' });
    return;
  }

  try {
    const webpush = await getWebPush();
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' });
    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // Heq subscriptions e vjetruara/të pavlefshme (410 Gone ose 404)
    const expired = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected' && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        expired.push(subs[i].endpoint);
      }
    });
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    res.status(200).json({ ok: true, sent, total: subs?.length || 0, expiredRemoved: expired.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
