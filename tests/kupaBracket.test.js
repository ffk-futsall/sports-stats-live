import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildCupBracket,bracketChampion,normalizeSlots} from '../src/lib/kupaBracket.ts';
const slots=Array.from({length:16},(_,i)=>'t'+i);
const m=(id,week,h,a,hs,as,status='finished')=>({id,week,homeTeamId:h,awayTeamId:a,homeScore:hs,awayScore:as,status,date:'2026-12-0'+week});
test('round one pairs follow slots; later rounds are unknown until winners exist',()=>{
 const r=buildCupBracket(slots,[]);
 assert.equal(r.length,4);assert.deepEqual(r.map(x=>x.length),[8,4,2,1]);
 assert.deepEqual([r[0][0].a,r[0][0].b,r[0][7].a,r[0][7].b],['t0','t1','t14','t15']);
 assert.equal(r[1][0].a,null);assert.equal(r[3][0].number,15);assert.equal(r[1][0].fromA,1);assert.equal(r[1][0].fromB,2);
});
test('winners advance automatically and champion is found',()=>{
 let ms=[m('1',1,'t0','t1',3,1),m('2',1,'t3','t2',2,0)];
 let r=buildCupBracket(slots,ms);
 assert.equal(r[0][0].winner,'t0');assert.equal(r[0][1].winner,'t3');assert.equal(r[1][0].a,'t0');assert.equal(r[1][0].b,'t3');
 ms.push(m('3',2,'t3','t0',1,4));r=buildCupBracket(slots,ms);assert.equal(r[1][0].winner,'t0');
});
test('unfinished or cancelled matches do not decide a tie; multi-leg aggregate works',()=>{
 let r=buildCupBracket(slots,[m('1',1,'t0','t1',1,0,'live')]);assert.equal(r[0][0].winner,null);assert.equal(r[0][0].matches.length,1);
 r=buildCupBracket(slots,[m('1',3,'t0','t1',1,0),m('2',3,'t1','t0',2,0)]);assert.equal(r[0][0].winner,null); // week mismatch (round 1 is week 1)
 const two=[m('a',1,'t0','t1',1,0),m('b',1,'t1','t0',2,0)];
 r=buildCupBracket(slots,two);assert.equal(r[0][0].winner,'t1');assert.equal(r[0][0].aggA,1);assert.equal(r[0][0].aggB,2);
 r=buildCupBracket(slots,[{...m('c',1,'t0','t1',1,0),status:'cancelled'}]);assert.equal(r[0][0].matches.length,0);
});
test('bad slot data is normalised',()=>{assert.equal(normalizeSlots(null).length,16);assert.equal(normalizeSlots(['x',5,'']).slice(0,3).join(),'x,,');});
