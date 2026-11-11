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
