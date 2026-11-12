import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicProtocolSnapshot } from '../api/_protocolProjection.js';
test('only explicitly approved fields are exposed', () => {
  const output=publicProtocolSnapshot({venue:'Palestra',city:'Prishtinë',phase:'first',clock:{elapsedMs:1000},signatures:{ref1:'private-signature'},notes:{incidents:'private-note'},teams:{a:{name:'A',players:[{name:'Test',shirtNo:'7',idNumber:'PRIVATEID'}],officials:[{name:'Coach',role:'Trainer',idNumber:'PRIVATEID'}]},b:{name:'B'}},timeline:[{kind:'card',minute:'7',sourceRow:'kkA',playerName:'Test',note:'private-note'}]});
  assert.equal(output.teams.a.players[0].name,'Test');
  assert.equal(output.events[0].minute,'7');
  const encoded=JSON.stringify(output);
  for (const privateValue of ['PRIVATEID','private-signature','private-note','elapsedMs','clock']) assert.equal(encoded.includes(privateValue), false);
});
test('malformed and missing data are safe', () => { assert.doesNotThrow(() => publicProtocolSnapshot(null)); assert.deepEqual(publicProtocolSnapshot({teams:{a:{players:'bad'}}}).teams.a.players, []); });

test('goal score exposes only the recorded numeric score', () => { const out=publicProtocolSnapshot({goals:[{team:'a',scorerName:'A',score:'1:0'},{team:'b',scorerName:'B',score:'private'}]}); assert.equal(out.goals[0].score,'1:0'); assert.equal(out.goals[1].score,''); });

test('starter flag comes from the match report and private player data stays private', () => {
  const output=publicProtocolSnapshot({teams:{a:{players:[
    {name:'Startues',shirtNo:'7',starter:true,idNumber:'secret'},
    {name:'Rezervë',shirtNo:'9',starter:false},
    {name:'Pa shënim',shirtNo:'3'},
    {name:'Tekst',shirtNo:'10',starter:'true'},
  ]},b:{players:[{name:'Vizitor',shirtNo:'1',starter:true}]}}});
  assert.deepEqual(output.teams.a.players.map(p=>p.starter),[true,false,false,false]);
  assert.equal(output.teams.b.players[0].starter,true);
  assert.equal(JSON.stringify(output).includes('secret'),false);
});
