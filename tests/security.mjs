import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
const { supabase } = await import('../api/_supabaseClient.js');
const { default: dataHandler } = await import('../api/data.js');
const { default: liveHandler } = await import('../api/live.js');
const { default: visitsHandler } = await import('../api/visitors.js');
const { default: normHandler } = await import('../api/normative-acts.js');
const { default: notifHandler } = await import('../api/notifications.js');
let writes = 0;
supabase.auth.getUser = async token => token === 'admin' ? { data: { user: { id: 'a', email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: { id: 'b', email_confirmed_at: '2026-01-01' } }, error: null };
supabase.from = table => ({
 select() { return { eq(k,v) { return { maybeSingle: async () => ({ data: v === 'a' ? { user_id: 'a' } : null, error: null }), single: async () => ({ data: { data: { users: [{ password: 'secret' }], teams: [] } }, error: null }) }; } }; },
 upsert: async payload => { writes++; assert.equal(payload.data.users, undefined); return { error: null }; },
});
function response() { return { code: 200, body: null, status(n) { this.code=n; return this; }, json(x) { this.body=x; return this; }, setHeader() {} }; }
const req=(method, token, extra={}) => ({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, query: {}, body: {}, ...extra });
for (const [handler,method] of [[dataHandler,'PUT'],[normHandler,'POST'],[normHandler,'DELETE'],[visitsHandler,'GET'],[notifHandler,'POST']]) {
 let res=response(); await handler(req(method),res); assert.equal(res.code,401);
 res=response(); await handler(req(method,'nonadmin'),res); assert.equal(res.code,403);
}
assert.equal(writes,0);
let res=response(); await dataHandler(req('PUT','admin',{body:{teams: [],users:[{password:'x'}]}}),res); assert.equal(res.code,200); assert.equal(writes,1);
res=response(); await dataHandler(req('GET'),res); assert.equal(res.code,200); assert.equal(res.body.users,undefined);
res=response(); await liveHandler(req('GET',null,{query:{field:'users'}}),res); assert.equal(res.code,400);
console.log('Authorization tests passed');
