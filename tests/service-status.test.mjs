import test from 'node:test';
import assert from 'node:assert/strict';
import {backupState} from '../app/service-status.ts';
test('daily copies allow yesterday and warn at two calendar days, including month boundaries',()=>{
 assert.deepEqual(backupState([{day:'2026-10-27'},{day:'2026-10-28'}],'2026-10-28'),{kind:'ok',day:'2026-10-28'});
 assert.equal(backupState([{day:'2026-09-30'}],'2026-10-01').kind,'ok');
 assert.equal(backupState([{day:'2026-09-30'}],'2026-10-02').kind,'stale');
});
test('missing copies differ from broken or future responses',()=>{
 assert.equal(backupState([],'2026-10-28').kind,'missing');
 for(const input of [null,{},[{day:'2026-02-30'}],[{day:'2026-10-29'}],[{}]])assert.equal(backupState(input,'2026-10-28').kind,'unknown');
});
