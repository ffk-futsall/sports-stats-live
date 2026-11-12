import {test} from 'node:test';import assert from 'node:assert/strict';
import {mergeProtocolMatches} from '../src/lib/protocolMatches.ts';
import {getHeadToHeadHistory,getTeamMatchHistory} from '../src/lib/matchHistory.ts';
import {calculateLiveStandings} from '../src/lib/standings.ts';
const m=(id,status='planned',props={})=>({id,homeTeamId:'a',awayTeamId:'b',competitionId:'c',seasonId:'s',week:1,date:'2026-11-12',status,isFeaturedLanding:true,...props});
const p=(id,phase,live,final={a:'',b:''},updatedAt='1')=>({portalMatchId:id,phase,updatedAt,scores:{live,final}});
const scores=(a,b)=>({a:String(a),b:String(b)});
const teams=['a','b'].map(id=>({id,name:id,competitionId:'c',seasonId:'s',logo:''}));
test('finished and live protocol scores appear in public views, official and cancelled results take precedence',()=>{
 const original=[m('live'),m('done'),m('official','finished',{homeScore:9,awayScore:1}),m('cancel','cancelled'),m('setup')];
 const reports=[p('live','first',scores(2,1)),p('done','finished',scores(2,2),scores(3,2)),p('official','finished',scores(1,1),scores(1,1)),p('cancel','first',scores(8,0)),p('setup','setup',scores(0,0))];
 const out=mergeProtocolMatches(original,reports);
 assert.deepEqual(out.map(x=>[x.status,x.homeScore,x.awayScore,x.protocolResult]),[['live',2,1,'live'],['finished',3,2,'finished'],['finished',9,1,undefined],['cancelled',undefined,undefined,undefined],['planned',undefined,undefined,undefined]]);
 assert.equal(original[0].status,'planned'); assert.equal(original[1].homeScore,undefined);
});
test('latest protocol wins and invalid scores never become fake zeroes',()=>{
 const out=mergeProtocolMatches([m('one'),m('bad'),m('fallback')],[p('one','first',scores(5,0),undefined,'2'),p('one','first',scores(0,1),undefined,'1'),p('bad','finished',{a:'',b:'2'}),p('fallback','finished',scores(3,2),{a:'',b:'3'})]);
 assert.deepEqual([out[0].homeScore,out[0].awayScore],[5,0]);assert.equal(out[1].homeScore,undefined);assert.equal(out[1].awayScore,undefined);assert.deepEqual([out[2].homeScore,out[2].awayScore],[3,2]);
});
test('current game and other protocol games show once; live is separate from completed H2H stats',()=>{
 const raw=[m('current'),m('done','planned',{date:'2026-10-01'}),m('confirmed','finished',{date:'2026-09-01',homeScore:1,awayScore:1})];
 const reports=[p('current','second',scores(8,0)),p('done','finished',scores(3,1)),p('confirmed','finished',scores(6,0))];const all=mergeProtocolMatches(raw,reports);
 const h=getHeadToHeadHistory(all,'a','b');assert.deepEqual(h.live.map(x=>x.id),['current']);assert.deepEqual(h.meetings.map(x=>x.id),['done','confirmed']);assert.deepEqual([h.teamAWins,h.draws,h.teamAGoals,h.teamBGoals],[1,1,4,2]);
 const history=getTeamMatchHistory(all,'a','current',reports,'2026-11-12');assert.deepEqual(history.live.map(x=>x.id),['current']);assert.deepEqual(history.past.map(x=>x.id),['done','confirmed']);assert.equal(history.upcoming.length,0);
 const rows=calculateLiveStandings(teams,raw,reports,'c');const a=rows.find(r=>r.teamId==='a');assert.deepEqual([a.played,a.points,a.goalsFor,a.goalsAgainst],[3,7,12,2]);
 const confirmed=raw.map(x=>x.id==='done'?{...x,status:'finished',homeScore:4,awayScore:2}:x);const after=calculateLiveStandings(teams,confirmed,reports,'c').find(r=>r.teamId==='a');assert.deepEqual([after.played,after.points,after.goalsFor,after.goalsAgainst],[3,7,13,3]);
});
