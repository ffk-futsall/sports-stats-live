import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHeadToHeadHistory, getTeamMatchHistory, hasResult } from '../src/lib/matchHistory.ts';
const m = (id, home, away, status, date, hs, as) => ({id,homeTeamId:home,awayTeamId:away,status,date,homeScore:hs,awayScore:as,competitionId:'c',seasonId:'s',week:1,isFeaturedLanding:false});
test('H2H counts only valid completed encounters and handles reversed venues',()=>{
  const fixtures=[m('1','a','b','finished','2026-01-01',3,1),m('2','b','a','finished','2026-02-01',4,2),m('3','a','b','finished','2026-03-01',0,0),m('4','a','b','finished','2026-04-01',undefined,0),m('5','a','b','planned','2026-05-01',0,0),m('6','a','x','finished','2026-01-02',8,0)];
  const h=getHeadToHeadHistory([...fixtures,fixtures[0]],'a','b','5');
  assert.deepEqual(h.meetings.map(x=>x.id),['3','2','1']); assert.deepEqual([h.teamAWins,h.teamBWins,h.draws,h.teamAGoals,h.teamBGoals],[1,1,1,5,5]);
  assert.equal(hasResult(m('bad','a','b','finished','',-1,0)),false);
  const strings=getHeadToHeadHistory([m('str','a','b','finished','2026-01-01','10','2')],'a','b','now'); assert.deepEqual([strings.teamAWins,strings.teamAGoals,strings.teamBGoals],[1,10,2]);
  assert.equal(hasResult(m('empty','a','b','finished','', '', '0')),false);
});
test('team history sorts and limits, excludes current, cancelled and protocol-live fixtures',()=>{
  const past=Array.from({length:6},(_,i)=>m(`p${i}`,'a','b','finished',`2026-01-0${i+1}`,i,0));
  const future=Array.from({length:6},(_,i)=>m(`f${i}`,'c','a','planned',`2026-12-0${i+1}`));
  const fixtures=[...past,...future,m('live','a','b','planned','2026-12-01'),m('done','a','b','planned','2026-12-02'),m('cancel','a','b','cancelled','2026-12-01'),m('old','a','b','planned','2025-01-01'),m('current','a','b','planned','2026-12-01'),m('undated','a','b','planned','')];
  const r=getTeamMatchHistory(fixtures,'a','current',[{portalMatchId:'live',phase:'first'},{portalMatchId:'done',phase:'finished'}],'2026-11-12');
  assert.deepEqual(r.past.map(x=>x.id),['p5','p4','p3','p2','p1']); assert.deepEqual(r.upcoming.map(x=>x.id),['f0','f1','f2','f3','f4']);
  const empty=getTeamMatchHistory([m('t','a','b','planned','')],'a','current',[],'2026-11-12'); assert.equal(empty.upcoming[0].id,'t');
});
