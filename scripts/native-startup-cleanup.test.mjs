import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/native-startup.js',import.meta.url),'utf8');
const saved=new Map();let removed=0,reloads=0;const deleted=[];
const context={window:{__TAURI_INTERNALS__:{},caches:{}},navigator:{serviceWorker:{controller:{},getRegistrations:async()=>[
  {scope:'http://tauri.localhost/',unregister:async()=>{removed++;}},
  {scope:'https://other.example/',unregister:async()=>{throw Error('must not touch another origin');}},
]}},location:{origin:'http://tauri.localhost',reload:()=>{reloads++;}},sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},caches:{keys:async()=>['embrodery-v4','unrelated-cache'],delete:async k=>deleted.push(k)},URL,console};
vm.runInNewContext(source,context);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(removed,1);assert.equal(reloads,1);assert.deepEqual(deleted,['embrodery-v4']);
vm.runInNewContext(source,context);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(removed,1,'Cleanup must run only once per session');
assert.equal(reloads,1,'Cleanup must not create a reload loop');
vm.runInNewContext(source,{...context,window:{}});
assert.equal(removed,1,'Web/PWA sessions must retain their service worker');
console.log('PASS: native stale worker cleanup, own-origin/cache scope, one recovery reload, and web/PWA preservation.');
