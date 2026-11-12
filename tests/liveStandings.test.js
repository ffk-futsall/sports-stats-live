import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateLeagueStandings,calculateLiveStandings} from '../src/lib/standings.ts';
const teams=['A','B','C','D'].map(id=>({id,name:id,logo:'',competitionId:'liga',seasonId:'s'}));
const match=(id,home,away,props={})=>({id,competitionId:'liga',seasonId:'s',week:1,homeTeamId:home,awayTeamId:away,status:'planned',...props});
const report=(id,phase,a,b,final={a:'',b:''})=>({portalMatchId:id,updatedAt:'2026-01-01',phase,scores:{live:{a,b},final}});
const get=(rows,id)=>rows.find(r=>r.teamId===id);
test('official standings calculate results and recent form chronologically, ignoring absent scores',()=>{
 const matches=[match('m2','A','C',{status:'finished',homeScore:0,awayScore:0,date:'2026-02-02'}),match('m1','A','B',{status:'finished',homeScore:3,awayScore:1,date:'2026-02-01'}),match('bad','A','D',{status:'finished',homeScore:undefined,awayScore:1})];
 const rows=calculateLeagueStandings(teams,matches,'liga');assert.deepEqual([get(rows,'A').played,get(rows,'A').points,get(rows,'A').goalsFor,get(rows,'A').goalsAgainst],[2,4,3,1]);assert.deepEqual(get(rows,'A').form,['W','D']);assert.equal(get(rows,'D').played,0);
});
test('live table projects all matches once, preserving official table',()=>{
 const matches=[match('old','A','C',{status:'finished',homeScore:2,awayScore:0}),match('live1','A','B',{status:'live',homeScore:9,awayScore:9}),match('live2','C','D',{status:'planned'})];
 const reports=[report('live1','first','1','2'),report('live2','second','0','0')];
 const official=calculateLeagueStandings(teams,matches,'liga'); const rows=calculateLiveStandings(teams,matches,reports,'liga');
 assert.deepEqual([get(rows,'A').played,get(rows,'A').points,get(rows,'A').goalsFor,get(rows,'A').goalsAgainst],[2,3,3,2]);
 assert.equal(get(rows,'A').liveResults[0].score,'1:2');assert.equal(get(rows,'B').liveResults[0].score,'2:1');assert.equal(get(rows,'D').points,1);assert.equal(get(official,'A').played,1);
});
test('confirmed official result replaces provisional protocol without double counting',()=>{
 const done=match('m','A','B',{status:'finished',homeScore:3,awayScore:2});const r=report('m','finished','2','2',{a:'3',b:'2'});
 let rows=calculateLiveStandings(teams,[done],[r],'liga');assert.equal(get(rows,'A').played,1);assert.equal(get(rows,'A').points,3);assert.equal(get(rows,'A').liveResults.length,0);
 rows=calculateLiveStandings(teams,[{...done,status:'live'}],[r],'liga');assert.equal(get(rows,'A').points,3);assert.equal(get(rows,'A').liveResults[0].provisional,true);
});
test('setup, invalid scores, cancelled games and other competitions are not included',()=>{
 const matches=[match('setup','A','B',{status:'planned'}),match('invalid','A','C',{status:'live'}),match('cancel','A','D',{status:'cancelled'}),match('other','A','B',{status:'live',competitionId:'other',homeScore:4,awayScore:0})];
 const rows=calculateLiveStandings(teams,matches,[report('setup','setup','0','0'),report('invalid','first','','2'),report('cancel','first','8','0')],'liga');assert.equal(get(rows,'A').played,0);
});
test('portal-only live score and latest report work; position change follows standings',()=>{
 const matches=[match('m','A','B',{status:'live',homeScore:1,awayScore:1})];
 let rows=calculateLiveStandings(teams,matches,[],'liga');assert.equal(get(rows,'A').points,1);
 const old={...report('m','first','0','2'),updatedAt:'1'},fresh={...report('m','first','2','0'),updatedAt:'2'};
 rows=calculateLiveStandings(teams,matches,[fresh,old],'liga');assert.equal(get(rows,'A').points,3);assert.equal(get(rows,'B').liveResults[0].score,'0:2');assert.ok(get(rows,'B').positionChange<0);
});
