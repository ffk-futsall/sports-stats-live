import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_KEY='fake';process.env.PROTOCOL_ORIGIN='https://protocol.example.invalid';
const {supabase}=await import('../api/_supabaseClient.js');
const {default:handler}=await import('../api/protocol.js');
let caller='allowed',delegate={id:'delegate-1',active:true,must_change_password:false},requests=[],blocked=false,archived=false,simulateLockRace=false,currentDraft=null,week=10,listRows=[];
supabase.auth.getUser=async()=>caller==='bad'?{error:new Error('invalid')}:{data:{user:{id:caller,email_confirmed_at:'yes'}}};
supabase.from=(table)=>{
 const q={table,filters:[],value:null,op:'read',select(){return this},order(){return this},then(resolve,reject){requests.push({table,filters:this.filters,op:this.op});return Promise.resolve({data:listRows,error:null}).then(resolve,reject)},eq(k,v){this.filters.push([k,v]);return this},is(k,v){this.filters.push([k,v]);return this},update(v){this.op='update';this.value=v;return this},async maybeSingle(){requests.push({table,filters:this.filters,op:this.op,value:this.value});if(table==='protocol_delegates')return {data:caller==='denied'?null:delegate,error:null};if(table==='protocol_assignments'){const authorized=this.filters.some(([k,v])=>k==='delegate_id'&&v===delegate.id);return {data:authorized&&!archived&&!(this.op==='update'&&simulateLockRace)?{id:'11111111-1111-1111-1111-111111111111',state:'accepted',draft_version:1,publication_blocked:blocked,match_details:{home:'A',away:'B',round:week},draft:currentDraft}:null,error:null};}return {error:new Error('unexpected table')}}};return q;
};
function mockRes(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},end(){return this}}}
const req=(method,body={},query={})=>({method,headers:{authorization:'Bearer token'},body,query});
const id='11111111-1111-1111-1111-111111111111';
test('unauthenticated and non-delegate users cannot access assignments',async()=>{let r=mockRes();await handler({method:'GET',headers:{},query:{}},r);assert.equal(r.statusCode,401);caller='denied';r=mockRes();await handler(req('GET'),r);assert.equal(r.statusCode,403);caller='allowed'});
test('first login must change password before accessing matches',async()=>{delegate.must_change_password=true;let r=mockRes();await handler(req('GET'),r);assert.equal(r.statusCode,403);assert.equal(r.body.code,'PASSWORD_CHANGE_REQUIRED');delegate.must_change_password=false});
test('rejection needs a reason and assignment responses are scoped',async()=>{requests=[];let r=mockRes();await handler(req('POST',{id,action:'respond',state:'rejected',reason:'  '}),r);assert.equal(r.statusCode,400);r=mockRes();await handler(req('POST',{id,action:'respond',state:'rejected',reason:'Nuk mundem'}),r);assert.equal(r.statusCode,200);let q=requests.find(x=>x.table==='protocol_assignments');assert.deepEqual(q.filters,[['id',id],['delegate_id',delegate.id],['state','pending'],['archived_at',null]]);assert.equal(q.value.rejection_reason,'Nuk mundem')});
test('writes are scoped, optimistic, and never touch portal standings',async()=>{requests=[];let r=mockRes();await handler(req('PUT',{id,version:0,published:true,draft:{teams:{a:{name:'A',players:[{name:'Test',idNumber:'secret'}]},b:{name:'B'}},clock:{elapsedMs:20},signatures:{a:'secret'}}}),r);assert.equal(r.statusCode,200);let q=requests.find(x=>x.table==='protocol_assignments'&&x.op==='update');assert.deepEqual(q.filters,[['id',id],['delegate_id',delegate.id],['state','accepted'],['draft_version',0],['publication_blocked',false],['archived_at',null]]);assert.equal(JSON.stringify(q.value.public_snapshot).includes('secret'),false);assert.equal(JSON.stringify(q.value.public_snapshot).includes('elapsedMs'),false);assert.equal(requests.some(q=>q.table==='app_data'),false)});
test('CORS grants only the configured protocol origin',async()=>{let r=mockRes();await handler({method:'OPTIONS',headers:{origin:'https://evil.invalid'}},r);assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);r=mockRes();await handler({method:'OPTIONS',headers:{origin:'https://protocol.example.invalid'}},r);assert.equal(r.headers['Access-Control-Allow-Origin'],'https://protocol.example.invalid')});
test('password change accepts any six-character combination and rejects shorter ones',async()=>{
 let captured='';supabase.auth.admin.updateUserById=async(_id,values)=>{captured=values.password;return {error:null}};
 let r=mockRes();await handler(req('POST',{action:'change-password',password:'12345'}),r);assert.equal(r.statusCode,400);
 for(const password of ['123456','abcdef','!!--__']){r=mockRes();await handler(req('POST',{action:'change-password',password}),r);assert.equal(r.statusCode,200);assert.equal(captured,password)}
});

test('administrative block prevents republishing while preserving draft',async()=>{blocked=true;requests=[];let r=mockRes();const draft={teams:{a:{name:'A'},b:{name:'B'}}};await handler(req('PUT',{id,version:0,published:true,draft}),r);assert.equal(r.statusCode,200);const q=requests.find(x=>x.table==='protocol_assignments'&&x.op==='update');assert.equal(q.value.published,false);assert.deepEqual(q.value.draft,draft);assert.ok(q.filters.some(([k,v])=>k==='publication_blocked'&&v===true));blocked=false});
test('concurrent administrative lock prevents stale publication',async()=>{simulateLockRace=true;let r=mockRes();await handler(req('PUT',{id,version:0,published:true,draft:{teams:{a:{name:'A'},b:{name:'B'}}}}),r);assert.equal(r.statusCode,409);simulateLockRace=false});
test('archived assignments cannot be read or saved',async()=>{archived=true;let r=mockRes();await handler(req('GET',{}, {id}),r);assert.equal(r.statusCode,404);r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:{}}),r);assert.equal(r.statusCode,404);archived=false});


test('weekly edit check uses the assigned week and scopes access to the delegate',async()=>{
 let r=mockRes();await handler(req('POST',{action:'verify-edit',id,password:'wrong'}),r);assert.equal(r.statusCode,403);
 r=mockRes();await handler(req('POST',{action:'verify-edit',id,password:'ffkfutsall10'}),r);assert.equal(r.statusCode,200);
 week='';r=mockRes();await handler(req('POST',{action:'verify-edit',id,password:'ffkfutsall'}),r);assert.equal(r.statusCode,400);week=10;
 archived=true;r=mockRes();await handler(req('POST',{action:'verify-edit',id,password:'ffkfutsall10'}),r);assert.equal(r.statusCode,404);archived=false;
});
test('protected match fields require weekly password after match editor closes, without blocking ordinary live updates',async()=>{
 const base={phase:'first',_editLocked:true,round:'10',teams:{a:{name:'A'},b:{name:'B'}},notes:{incidents:''}};currentDraft=base;
 const changed={...base,teams:{a:{name:'Changed'},b:{name:'B'}}};let r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:changed}),r);assert.equal(r.statusCode,403);
 r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:changed,editPassword:'ffkfutsall11'}),r);assert.equal(r.statusCode,403);
 r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:changed,editPassword:'ffkfutsall10'}),r);assert.equal(r.statusCode,200);
 r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:{...base,phase:'setup',_editLocked:false,notes:{incidents:'Updated'}}}),r);assert.equal(r.statusCode,200);let q=requests.filter(x=>x.table==='protocol_assignments'&&x.op==='update').at(-1);assert.equal(q.value.draft._editLocked,true);
 currentDraft={...base,phase:'setup'};r=mockRes();await handler(req('PUT',{id,version:0,published:false,draft:changed}),r);assert.equal(r.statusCode,403);currentDraft=null;
});
test('dashboard returns phase but not private draft details',async()=>{
 listRows=[{id,state:'accepted',draft:{phase:'finished',signatures:{delegate:'private'},teams:{a:{idNumber:'secret'}}}}];let r=mockRes();await handler(req('GET'),r);assert.equal(r.statusCode,200);assert.equal(r.body.assignments[0].phase,'finished');assert.equal('draft' in r.body.assignments[0],false);assert.equal(JSON.stringify(r.body).includes('secret'),false);listRows=[];
});
