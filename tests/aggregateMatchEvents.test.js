import {test} from 'node:test';import assert from 'node:assert/strict';
import {aggregateMatchEvents} from '../src/lib/aggregateMatchEvents.ts';
const report=(id,updatedAt,events)=>({portalMatchId:id,updatedAt,phase:'finished',scores:{final:{a:'2',b:'1'}},goals:[],events});
const event=(kind,team='a',sourceRow='')=>({kind,team,sourceRow,period:'P1'});
test('sums recorded events once and uses manual foul values in preference to protocol',()=>{
 const matches=[{id:'a',status:'finished',fouls_home:4,fouls_away:3},{id:'b',status:'finished'},{id:'c',status:'cancelled'}];
 const reports=[report('a','1',[event('foul')]),report('a','2',[event('foul'),event('card','a','kvB1'),event('timeout')]),report('b','1',[event('foul'),event('card','b','kkB')]),report('c','1',[event('card','a','kvB1')])];
 assert.deepEqual(aggregateMatchEvents(matches,reports),{fouls:8,yellow:1,red:1,timeout:1,withProtocol:2,withFouls:2});
});
test('manual-only matches count recorded fouls and do not invent other events',()=>{
 assert.deepEqual(aggregateMatchEvents([{id:'x',status:'finished',fouls_home:1,fouls_away:2}],[]),{fouls:3,yellow:0,red:0,timeout:0,withProtocol:0,withFouls:1});
});
