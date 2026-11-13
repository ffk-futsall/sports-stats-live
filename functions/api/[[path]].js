import { adapt } from '../../cloudflare/adapter.js';

// Lazy imports prevent unrelated endpoints from requiring push configuration.
const handlers = {
  'admin-session': () => import('../../api/admin-session.js'),
  data: () => import('../../api/data.js'),
  delegates: () => import('../../api/delegates.js'),
  live: () => import('../../api/live.js'),
  'normative-acts': () => import('../../api/normative-acts.js'),
  notifications: () => import('../../api/notifications.js'),
  'protocol-live': () => import('../../api/protocol-live.js'),
  protocol: () => import('../../api/protocol.js'),
  'push-subscribe': () => import('../../api/push-subscribe.js'),
  'send-notification': () => import('../../api/send-notification.js'),
  visitors: () => import('../../api/visitors.js'),
  votes: () => import('../../api/votes.js'),
};

export async function onRequest({request, params}) {
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!Object.hasOwn(handlers, path)) return Response.json({error: 'Nuk u gjet.'}, {status: 404});
  try {
    const {default: handler} = await handlers[path]();
    return await adapt(request, handler);
  } catch (error) {
    console.error('API request failed:', error?.message || 'unknown error');
    return Response.json({error: 'Shërbimi nuk është i disponueshëm.'}, {status: 503});
  }
}
