import {test} from 'node:test';import assert from 'node:assert/strict';
import {aggregateScorers} from '../src/lib/aggregateScorers.ts';
const matches=[{id:'one',homeTeamId:'a',awayTeamId:'b',competitionId:'super',status:'planned'},{id:'two',homeTeamId:'a',awayTeamId:'b',competitionId:'cup',status:'finished'},{id:'cancel',homeTeamId:'a',awayTeamId:'b',competitionId:'super',status:'cancelled'}];
const protocol=(id,updatedAt,goals,phase='finished')=>({portalMatchId:id,updatedAt,phase,goals});
const goal=(name,team='a',period='P1')=>({scorerName:name,team,period});
test('protocol goals are aggregated by name without requiring a player profile, across competitions',()=>{
 const reports=[protocol('one','1',[goal('Arber Hoxha'),goal('Arber Hoxha'),goal('B Lojtar','b'),goal('Arber Hoxha','a','Penallti')]),protocol('two','1',[goal('Arber Hoxha')]),protocol('cancel','1',[goal('Arber Hoxha')])];
 const out=aggregateScorers(matches,[],[],[],reports,'super');assert.deepEqual(out.map(x=>[x.firstName,x.lastName,x.goals]),[['Arber','Hoxha',2],['B','Lojtar',1]]);
 assert.equal(aggregateScorers(matches,[],[],[],reports,'cup')[0].goals,1);
});
test('latest report wins; portal goal entries and manual totals avoid duplicated protocol counts',()=>{
 const reports=[protocol('one','1',[goal('Arber Hoxha')]),protocol('one','2',[goal('Arber Hoxha'),goal('Arber Hoxha')])];
 const player={id:'p',firstName:'Arber',lastName:'Hoxha',teamId:'a',photo:''};
 assert.equal(aggregateScorers(matches,[player],[],[],reports)[0].goals,2);
 const recorded=[{matchId:'one',playerId:'p',teamId:'a',isOwnGoal:false}];
 assert.equal(aggregateScorers(matches,[player],recorded,[],reports)[0].goals,1);
 const manual=[{id:'s',firstName:'Arber',lastName:'Hoxha',teamId:'a',competitionId:'super',photo:'',goals:3,isManual:true}];
 assert.equal(aggregateScorers(matches,[player],[],manual,reports)[0].goals,3);
});
