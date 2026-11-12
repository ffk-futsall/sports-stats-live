import {test} from 'node:test';import assert from 'node:assert/strict';import {protocolPlayerCards} from '../src/lib/protocolPlayerCards.ts';
const match={id:'m',status:'finished',homeTeamId:'a',awayTeamId:'b',competitionId:'c',seasonId:'s',week:2};
const card=(name,sourceRow,team='a')=>({kind:'card',team,playerName:name,sourceRow});
const report={portalMatchId:'m',phase:'finished',updatedAt:'1',events:[card('Arber Hoxha','kvB1'),card('Arber Hoxha','kkA'),card('Unknown Name','kvB2','b'),card('Unknown Name','invalid','b')]};
const player={id:'p',teamId:'a',firstName:'Arber',lastName:'Hoxha',photo:''};
test('reported cards can be shown without a player profile and map only unambiguous names',()=>{const r=protocolPlayerCards([match],[player],[],[report]);assert.deepEqual(r.map(x=>[x.playerId,x.yellowCards,x.redCards]),[['p',1,1],[undefined,1,0]])});
test('manual record takes precedence for the same player, week and competition',()=>{const manual=[{playerId:'p',teamId:'a',competitionId:'c',seasonId:'s',week:2,yellowCards:1,redCards:0}];const r=protocolPlayerCards([match],[player],manual,[report]);assert.equal(r.length,1);assert.equal(r[0].firstName,'Unknown')});
