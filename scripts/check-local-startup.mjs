import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const entry = process.argv[2];
assert.ok(entry, 'Supply a built HTML entry');
const html = fs.readFileSync(entry, 'utf8');
const root = path.dirname(entry);
const resources = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)]
  .map(match => match[1]).filter(url => /\.(js|css)(?:\?|$)/.test(url));
assert.ok(resources.some(url => url.endsWith('.js')), 'Built entry must load bundled JS');
assert.ok(resources.some(url => url.endsWith('.css')), 'Built entry must load bundled CSS');
for (const resource of resources) {
  assert.ok(!/^(?:https?:)?\/\//.test(resource), `Startup must not wait for external resources: ${resource}`);
  const local = path.join(root, resource.replace(/^\//, '').split('?')[0]);
  assert.ok(fs.existsSync(local), `Missing bundled startup asset: ${local}`);
  if (resource.endsWith('.css')) {
    const css = fs.readFileSync(local, 'utf8');
    assert.ok(css.includes('.bg-slate-50') && css.includes('.text-white'), 'Tailwind utilities must be compiled locally');
  }
}
assert.ok(!html.includes('cdn.tailwindcss.com') && !html.includes('fonts.googleapis.com'), 'Startup must be independent of CDN access');
assert.ok(html.includes('Loading Embroidery Statement'), 'Initial document must have a visible loading state');
console.log(`PASS: ${entry} has local startup resources and a visible initial screen.`);
