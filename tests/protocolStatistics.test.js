import {test} from 'node:test';
import assert from 'node:assert/strict';
import {protocolStatistics} from '../src/lib/protocolStatistics.ts';
const match={scores:{live:{a:'4',b:'2'},first:{a:'2',b:'1'},second:{a:'2',b:'1'}},goals:[{team:'a',period:'P1'},{team:'b',period:'P2'},{team:'a',period:'Penallti'}],events:[
{team:'a',kind:'foul',period:'P1'},{team:'a',kind:'foul',period:'P2'},{team:'b',kind:'foul',period:'P2'},
{team:'a',kind:'card',period:'P1',sourceRow:'kvB1'},{team:'b',kind:'card',period:'P2',sourceRow:'kkB'},
{team:'b',kind:'card',period:'',sourceRow:'kvB2'},{team:'b',kind:'card',period:'P1',sourceRow:''},
{team:'a',kind:'timeout',period:'P1'},{team:'b',kind:'timeout',period:'P2'},
{team:'a',kind:'goal',period:'P1'}]};
const values=result=>result.rows.map(({a,b})=>[a,b]);
test('score and event statistics count correctly without duplicated goals',()=>{
 const result=protocolStatistics(match,'match'); assert.deepEqual(values(result),[[4,2],[2,1],[1,1],[0,1],[1,1]]);assert.equal(result.unknownPeriod,true);assert.equal(result.unknownCard,true);assert.equal(result.goalFallback,false);
});
test('half filters exclude undated events and handle cards and timeouts',()=>{
 assert.deepEqual(values(protocolStatistics(match,'first')),[[2,1],[1,0],[1,0],[0,0],[1,0]]);
 assert.deepEqual(values(protocolStatistics(match,'second')),[[2,1],[1,1],[0,0],[0,1],[0,1]]);
});
test('missing and malformed scores use recorded non-shootout goals, preserving zero',()=>{
 const result=protocolStatistics({...match,scores:{live:{a:'',b:'bad'},first:{a:'',b:''},second:{a:'',b:''}}},'match');
 assert.deepEqual(values(result)[0],[1,1]);assert.equal(result.goalFallback,true);
 assert.deepEqual(values(protocolStatistics({...match,scores:{live:{a:'0',b:'0'}}},'match'))[0],[0,0]);
 assert.deepEqual(values(protocolStatistics({scores:{},events:[],goals:[]},'second')),[[0,0],[0,0],[0,0],[0,0],[0,0]]);
});

test('finished match goals use the final score rather than an older live score',()=>{const r=protocolStatistics({...match,phase:'finished',scores:{...match.scores,final:{a:'3',b:'2'}}},'match');assert.deepEqual(values(r)[0],[3,2]);});
