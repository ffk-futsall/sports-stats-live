import test from 'node:test';
import assert from 'node:assert/strict';
import {collectLocalBackup} from '../src/lib/localBackup.js';
const storage = x => ({getItem: k => x[k] ?? null});
test('exports only specified business data and excludes editor passwords', () => {
  const result = collectLocalBackup(storage({ffk_player_stats:'[{"id":"1"}]',ffk_editors:'[{"id":"2","username":"a","password":"secret","access_token":"secret"}]', 'sb-token':'secret'}), new Date('2026-11-12T00:00:00Z'));
  assert.equal(result.records.ffk_player_stats.length,1);
  assert.equal(result.records.ffk_editors[0].username,'a');
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.equal(result.errors.length,0);
});
test('reports malformed data without deleting or replacing it', () => {
  const result = collectLocalBackup(storage({ffk_officials:'invalid',ffk_match_sheets:'{}'}));
  assert.deepEqual(result.errors,['ffk_officials','ffk_match_sheets']);
  assert.deepEqual(result.records,{});
});
