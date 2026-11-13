import test from 'node:test';
import assert from 'node:assert/strict';
import { adapt } from '../cloudflare/adapter.js';

test('translates method, headers, query and JSON body', async () => {
  const result = await adapt(new Request('https://example.test/api/test?id=a%20b', {method:'POST', headers:{authorization:'Bearer example', 'content-type':'application/json'}, body:JSON.stringify({value:4})}), async (req,res) => {
    assert.equal(req.method,'POST'); assert.equal(req.headers.authorization,'Bearer example'); assert.equal(req.query.id,'a b'); assert.equal(req.body.value,4);
    res.setHeader('Cache-Control','no-store'); res.status(201).json({ok:true});
  });
  assert.equal(result.status,201); assert.equal(result.headers.get('cache-control'),'no-store'); assert.deepEqual(await result.json(),{ok:true});
});
test('preserves 204 CORS preflight', async () => {
  const result = await adapt(new Request('https://example.test/api/protocol',{method:'OPTIONS'}), async (req,res) => res.setHeader('Access-Control-Allow-Origin','https://example.test').status(204).end());
  assert.equal(result.status,204); assert.equal(result.headers.get('access-control-allow-origin'),'https://example.test'); assert.equal(await result.text(),'');
});
test('rejects invalid and oversize request bodies', async () => {
  const fail = () => {throw Error('handler must not execute');};
  assert.equal((await adapt(new Request('https://example.test/api/x',{method:'POST',body:'{'}),fail)).status,400);
  assert.equal((await adapt(new Request('https://example.test/api/x',{method:'POST',body:'a'.repeat(3*1024*1024+1)}),fail)).status,413);
});
