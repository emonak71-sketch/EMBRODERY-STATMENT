import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const path = new URL('../components/DownloadPortal.tsx', import.meta.url);
const source = fs.readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require: createRequire(path) });
const cases = [
 ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0, 'windows'],
 ['Mozilla/5.0 (Windows NT 10.0; WOW64; rv:120.0)', 'Win32', 0, 'windows'],
 ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win64', 0, 'windows'],
 ['Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5, 'android'],
 ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5, 'web'],
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 'iPad', 5, 'web'],
 ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5, 'web'],
 ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel', 0, 'web'],
 ['Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0, 'web'],
];
for (const [ua, platform, touch, expected] of cases) assert.equal(exports.detectDevice(ua, platform, touch).recommended, expected);
assert.equal(exports.detectDevice(cases[4][0], 'MacIntel', 5).apple, 'ios');
assert.equal(exports.detectDevice(cases[7][0], 'MacIntel', 0).apple, 'mac');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0; WOW64)', 'Win32', 0).architecture, 'x64');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0; Win32; x86)', 'Win32', 0).architecture, 'x86');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0).architecture, 'x64');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0, 'x86', '32').architecture, 'x86');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0, 'x86', '64').architecture, 'x64');
assert.equal(exports.detectDevice('Mozilla/5.0 (Windows NT 10.0; ARM64)', 'Win32', 0, 'arm', '64').architecture, 'arm64');
const portalText = fs.readFileSync(path, 'utf8');
assert.match(portalText, /Windows 32-bit installer is not published yet/);
assert.match(portalText, /Download Windows \{device\.architecture/);
assert.match(portalText, /32-bit EXE/);
const routes = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url))).rewrites;
for (const route of ['/download', '/download.html']) assert.equal(routes.find(r => r.source === route)?.destination, '/download.html');
assert.equal(routes.at(-1).destination, '/index.html');
console.log('Download device cases passed: Windows, Android, iPhone, iPad, desktop-mode iPad, Mac, Linux; both Vercel routes preserved.');
