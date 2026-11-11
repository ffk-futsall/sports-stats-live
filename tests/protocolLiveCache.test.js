import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_KEY='fake';
const {supabase}=await import('../api/_supabaseClient.js');const {default:handler}=await import('../api/protocol-live.js');let failed=false,filters=[];
supabase.from=()=>({select(){return this},eq(k,v){filters.push([k,v]);return this},is(k,v){filters.push([k,v]);return this},async order(){return failed?{error:new Error('db')}:{data:[{id:'1',portal_match_id:'2',public_snapshot:{phase:'first'},updated_at:'now'}]}}});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}});
test('only published active projections are cached briefly',async()=>{filters=[];failed=false;let r=response();await handler({method:'GET'},r);assert.equal(r.code,200);assert.equal(r.headers['Vercel-CDN-Cache-Control'],'public, s-maxage=5');assert.ok(filters.some(([k,v])=>k==='publication_blocked'&&v===false));assert.ok(filters.some(([k,v])=>k==='archived_at'&&v===null));assert.equal(r.body.matches[0].phase,'first')});
test('failure is not cached',async()=>{failed=true;let r=response();await handler({method:'GET'},r);assert.equal(r.code,503);assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['Vercel-CDN-Cache-Control'],undefined)});
