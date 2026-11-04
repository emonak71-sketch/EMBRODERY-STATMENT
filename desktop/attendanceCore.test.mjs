import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const path = new URL('./attendanceCore.ts', import.meta.url);
const source = readFileSync(path, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const require = createRequire(import.meta.url);
const module = { exports: {} };
new Function('module', 'exports', 'require', outputText)(module, module.exports, require);
const { attendanceCompleteness, bangladeshClock, dueSessions, dueCheckpoints } = module.exports;
const workers = [{ id: 'w1', is_active: true, joining_date: '2026-01-01' }, { id: 'w2', is_active: true, joining_date: '2026-01-01' }, { id: 'old', is_active: false, joining_date: '2026-01-01' }];
assert.equal(attendanceCompleteness(workers, [], '2026-11-04').complete, false);
assert.deepEqual(attendanceCompleteness(workers, [{worker_id:'w1',status:'present'},{worker_id:'w2',status:'absent'}], '2026-11-04').missingIds, []);
assert.equal(attendanceCompleteness(workers, [{worker_id:'w1',status:'present'}], '2026-11-04').recorded, 1);
assert.equal(attendanceCompleteness(workers, [{worker_id:'w1',status:'present'}, {worker_id:'w2',status:''}], '2026-11-04').complete, false);
assert.deepEqual(dueSessions(10*60+59,{morning:'11:00',night:'23:00'}),[]);
assert.deepEqual(dueSessions(11*60,{morning:'11:00',night:'23:00'}),['morning']);
assert.deepEqual(dueSessions(23*60,{morning:'11:00',night:'23:00'}),['morning','night']);
assert.equal(bangladeshClock(new Date('2026-11-04T05:00:00.000Z')).minutes, 11*60);
assert.deepEqual(
  dueCheckpoints({date:'2026-11-05',minutes:8*60},{morning:'11:00',night:'23:00'}),
  [{date:'2026-11-04',session:'night'}],
  'Startup after midnight should recover a missed previous-night checkpoint'
);
assert.deepEqual(
  dueCheckpoints({date:'2026-11-05',minutes:12*60},{morning:'11:00',night:'23:00'}),
  [{date:'2026-11-05',session:'morning'}],
  'An old previous-night checkpoint should not create a stale reminder'
);
console.log('Attendance reminder core tests passed.');
