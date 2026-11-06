import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../index.css');
const gate = read('../components/AppLockGate.tsx');
const biometric = read('../components/BiometricLock.tsx');
const owner = read('../components/OwnerApp.tsx');
const ownerControl = read('../components/OwnerControlCenter.tsx');
const splash = read('../components/SplashScreen.tsx');
const customerHtml = read('../index.html');
const ownerHtml = read('../owner.html');
const pkg = JSON.parse(read('../package.json'));
const lock = JSON.parse(read('../package-lock.json'));
const tauri = JSON.parse(read('../src-tauri/tauri.conf.json'));
const ownerTauri = JSON.parse(read('../src-tauri/tauri.owner.conf.json'));
const appVersion = read('../desktop/appVersion.ts');

for (const keyframe of [
  'es-page-enter', 'es-stat-arrive', 'es-nav-arrive', 'es-modal-enter',
  'es-auth-panel-enter', 'es-auth-content-left', 'es-auth-content-right',
  'es-lock-panel-enter', 'es-lock-emblem-breathe'
]) {
  assert.ok(css.includes(`@keyframes ${keyframe}`), `Missing motion keyframe: ${keyframe}`);
}
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion accessibility support must remain');
assert.ok(css.includes('@media print'), 'Print output must not animate');
assert.ok(css.includes('.app-main > div'), 'Customer page transitions must be applied');
assert.ok(css.includes('.owner-main > section'), 'Owner page transitions must be applied');
assert.ok(gate.includes('app-lock-screen') && gate.includes('app-lock-panel'), 'App Lock must use the shared secure-access motion');
assert.ok(biometric.includes('biometric-lock-screen') && biometric.includes('biometric-lock-card'), 'Biometric Lock must use the shared secure-access motion');
assert.ok(owner.includes('owner-auth-screen') && owner.includes('owner-auth-panel'), 'Owner sign-in must use the shared motion');
assert.ok(ownerControl.includes('owner-control-shell') && ownerControl.includes('owner-main'), 'Owner dashboard must use the shared motion');
assert.ok(splash.includes('customer-brand-intro') && splash.includes('brand-intro-thread'), 'Customer startup must use the new threaded logo reveal');
assert.ok(customerHtml.includes('/index.css?v=1.0.11'), 'Customer PWA must request the refreshed motion stylesheet');
assert.ok(ownerHtml.includes('/index.css?v=1.0.11'), 'Owner PWA must request the refreshed motion stylesheet');
assert.equal(pkg.version, '1.0.11');
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(tauri.version, pkg.version);
assert.equal(ownerTauri.version, pkg.version);
assert.ok(appVersion.includes(`APP_VERSION = '${pkg.version}'`), 'Customer app version metadata must match');
console.log('Premium motion contract passed: Customer, Owner, App Lock, Biometric, splash, reduced-motion, print and synchronized version metadata.');
