// Cloudflare Worker: shërben /api/* me të njëjtat handler-a të Vercel (api/*.js)
// dhe i lë gjithë pjesën tjetër te asset-et statike (SPA) nga ./dist.
import data from '../api/data.js';
import live from '../api/live.js';
import votes from '../api/votes.js';
import visitors from '../api/visitors.js';
import notifications from '../api/notifications.js';
import pushSubscribe from '../api/push-subscribe.js';
import sendNotification from '../api/send-notification.js';
import adminSession from '../api/admin-session.js';
import delegates from '../api/delegates.js';
import protocol from '../api/protocol.js';
import protocolLive from '../api/protocol-live.js';
import normativeActs from '../api/normative-acts.js';
import localData from '../api/local-data.js';

const routes = {
  'data': data,
  'live': live,
  'votes': votes,
  'visitors': visitors,
  'notifications': notifications,
  'push-subscribe': pushSubscribe,
  'send-notification': sendNotification,
  'admin-session': adminSession,
  'delegates': delegates,
  'protocol': protocol,
  'protocol-live': protocolLive,
  'normative-acts': normativeActs,
  'local-data': localData,
};

// Kopjon variablat/secret-et e Cloudflare te process.env (handler-at e përdorin process.env).
function syncEnv(env) {
  for (const [key, value] of Object.entries(env || {})) {
    if (typeof value === 'string') process.env[key] = value;
  }
}

async function readBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const type = request.headers.get('content-type') || '';
  const text = await request.text();
  if (!text) return undefined;
  if (type.includes('application/json')) {
    try { return JSON.parse(text); } catch { return undefined; }
  }
  return text;
}

// Adapter Node-style (req, res) -> Response
async function runHandler(handler, request) {
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const req = {
    method: request.method,
    headers,
    query: Object.fromEntries(url.searchParams),
    body: await readBody(request),
    url: url.pathname + url.search,
  };

  const outHeaders = new Headers();
  let status = 200;
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });
  const send = (body, contentType) => {
    if (contentType && !outHeaders.has('content-type')) outHeaders.set('content-type', contentType);
    const nullBody = status === 204 || status === 304;
    finish(new Response(nullBody ? null : body, { status, headers: outHeaders }));
  };
  const res = {
    status(code) { status = code; return res; },
    setHeader(name, value) { outHeaders.set(name, String(value)); return res; },
    json(obj) { send(JSON.stringify(obj), 'application/json; charset=utf-8'); return res; },
    send(body) { send(typeof body === 'string' ? body : JSON.stringify(body), 'text/plain; charset=utf-8'); return res; },
    end(body) { send(body ?? null); return res; },
  };

  const result = handler(req, res);
  // Nëse handler-i përfundon pa dërguar përgjigje, mos e lër kërkesën të varet.
  Promise.resolve(result).then(() => {
    finish(new Response(JSON.stringify({ error: 'Pa përgjigje' }), { status: 500, headers: { 'content-type': 'application/json' } }));
  }).catch((e) => {
    finish(new Response(JSON.stringify({ error: e?.message || 'Gabim i brendshëm' }), { status: 500, headers: { 'content-type': 'application/json' } }));
  });
  return done;
}

export default {
  async fetch(request, env, ctx) {
    syncEnv(env);
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
      const handler = routes[name];
      if (!handler) {
        return new Response(JSON.stringify({ error: 'Nuk u gjet' }), { status: 404, headers: { 'content-type': 'application/json' } });
      }
      return runHandler(handler, request);
    }
    return env.ASSETS.fetch(request);
  },
};
