import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const prompt = read('desktop/DesktopUpdatePrompt.tsx');
const customerHost = read('desktop/DesktopHost.tsx');
const ownerHost = read('desktop/OwnerDesktopHost.tsx');
const native = read('src-tauri/src/lib.rs');
const ownerConfig = read('src-tauri/tauri.owner.conf.json');
const workflow = read('.github/workflows/windows-desktop-release.yml');
const notes = read('RELEASE_NOTES_1.0.20.md');

for (const value of ['desktop_check_update','desktop_install_update','Update Now','Later','What’s new in this update','desktop:app-opened','embroidery:owner-open-updates','embroidery:check-updates']) {
  assert.ok(prompt.includes(value), 'Update prompt must include: ' + value);
}
assert.ok(!prompt.includes('localStorage'), 'Dismissal must not persist across app launches.');
assert.ok(customerHost.includes('DesktopUpdatePrompt audience="customer"'));
assert.ok(!customerHost.includes('desktop_install_update'), 'Customer startup must not silently install updates.');
assert.ok(ownerHost.includes('DesktopUpdatePrompt audience="owner"'));
assert.ok(native.includes('desktop:app-opened'));
assert.ok(ownerConfig.includes('releases/latest/download/latest-owner.json'));
assert.equal((workflow.match(/notes = \$releaseNotes/g) || []).length, 2, 'Both updater manifests must include the full release notes.');
assert.equal((workflow.match(/RELEASE_NOTES_\\$version\\.md/g) || []).length, 2, 'Both updater manifests must load the versioned release notes file.');
assert.ok(notes.includes('## Customer application'));
assert.ok(notes.includes('## Owner Control Center'));
assert.ok(notes.includes('Later'));
assert.ok(notes.includes('Update Now'));

console.log('Update popup contract passed: startup/tray checks, per-session dismissal, manual install, and release notes.');
