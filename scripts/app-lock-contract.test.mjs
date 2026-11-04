import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('App.tsx');
const service = read('services/supabaseService.ts');
const edge = read('supabase/functions/app-lock/index.ts');
const sql = read('supabase/app-lock-password-sync.sql');
const gate = read('components/AppLockGate.tsx');
const settings = read('components/AppLockSettings.tsx');
const index = read('index.tsx');
const onlineGate = read('OnlineOnlyGate.tsx');

assert.ok(app.includes("import AppLockGate from './components/AppLockGate';"), 'App Lock gate must be wired into the application');
assert.ok(app.includes("if (user && appLockState !== 'unlocked')"), 'Dashboard must remain blocked until App Lock unlocks');
assert.ok(app.includes("if (user && appLockState === 'unlocked' && !isMisconfigured)"), 'Business data must load only after unlock');
assert.ok(app.includes("setInterval(() => void checkRemoteLockVersion(), 60_000)"), 'Cross-device password changes must be detected');
assert.ok(!app.includes("document.addEventListener('visibilitychange'"), 'Switching browser tabs must not repeatedly prompt for the App Lock');

assert.ok(service.includes("resetPasswordForEmail(cleanEmail)"), 'App Lock recovery must send the existing Supabase recovery email');
assert.ok(service.includes("!/^\\d{8}$/.test(cleanOtp)"), 'Client service must reject every recovery code except exactly eight digits');
assert.ok(service.includes("action: 'reset', email: cleanEmail, otp: cleanOtp, newPassword"), 'App Lock recovery must be verified by the server function');

assert.ok(edge.includes('PBKDF2_ITERATIONS = 310_000'), 'App Lock passwords must use the configured PBKDF2 work factor');
assert.ok(edge.includes('verifyOtp({ email, token: otp, type: "recovery" })'), 'Recovery must verify the Supabase recovery OTP');
assert.ok(edge.includes('!/^\\d{8}$/.test(otp)'), 'Server must reject every OTP except exactly eight digits');
assert.ok(edge.includes('password_hash'), 'Only the derived password hash should be stored');
assert.ok(!edge.includes('auth.updateUser('), 'App Lock reset must not change the account password');

assert.ok(sql.includes('create schema if not exists private'), 'App Lock storage must be in a private schema');
assert.ok(sql.includes('create table if not exists private.app_lock_credentials'), 'Private App Lock credential table must exist');
assert.ok(sql.includes('alter table private.app_lock_credentials enable row level security'), 'App Lock credentials must have RLS enabled');
assert.ok(sql.includes('revoke all on table private.app_lock_credentials from public, anon, authenticated'), 'Client roles must not read App Lock credentials');
assert.ok(sql.includes('to service_role'), 'Only the server service role should access App Lock credentials');

assert.ok(gate.includes('pattern="[0-9]{8}"'), 'Unlock recovery UI must accept exactly eight OTP digits');
assert.ok(settings.includes('pattern="[0-9]{8}"'), 'Settings recovery UI must accept exactly eight OTP digits');
assert.ok(index.includes('<OnlineOnlyGate>'), 'The whole app must be protected by the online-only gate');
assert.ok(onlineGate.includes('setInterval(check, 5000)'), 'The app must periodically recheck live connectivity');

console.log('PASS: App Lock gating, 8-digit recovery, server-side password hashing, private DB access, cross-device sync and online-only guard.');
