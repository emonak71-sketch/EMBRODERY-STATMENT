import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoots = ['App.tsx', 'components', 'contexts', 'services'];
const files = [];

function collect(entry) {
  const absolute = path.join(root, entry);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(absolute)) collect(path.join(entry, child));
    return;
  }
  if (absolute.endsWith('.tsx') || absolute.endsWith('.ts')) files.push(absolute);
}
sourceRoots.forEach(collect);

const failures = [];
let buttonCount = 0;
let formCount = 0;

function hasAttribute(attributes, name) {
  return attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === name
  );
}
function getAttribute(attributes, name) {
  return attributes.properties.find(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === name
  );
}
function readStringAttribute(attributes, name) {
  const attr = getAttribute(attributes, name);
  if (!attr || !attr.initializer || !ts.isStringLiteral(attr.initializer)) return '';
  return attr.initializer.text;
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node, insideSubmitForm = false) {
    let formHasSubmit = insideSubmitForm;

    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(source).toLowerCase();
      const attrs = node.openingElement.attributes;
      if (tag === 'form') {
        formCount += 1;
        formHasSubmit = hasAttribute(attrs, 'onSubmit');
        if (!formHasSubmit) failures.push(path.relative(root, file) + ': form without onSubmit handler');
      }
      if (tag === 'button') {
        buttonCount += 1;
        const hasClick = hasAttribute(attrs, 'onClick');
        const type = readStringAttribute(attrs, 'type');
        if (!hasClick && !(type === 'submit' && formHasSubmit)) {
          failures.push(path.relative(root, file) + ': button without an action or submitting form at line ' + source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
        }
      }
      ts.forEachChild(node, child => visit(child, formHasSubmit));
      return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source).toLowerCase();
      if (tag === 'button') {
        buttonCount += 1;
        if (!hasAttribute(node.attributes, 'onClick')) {
          failures.push(path.relative(root, file) + ': self-closing button without onClick handler');
        }
      }
    }

    ts.forEachChild(node, child => visit(child, formHasSubmit));
  }

  visit(source);
}

const css = fs.readFileSync(path.join(root, 'index.css'), 'utf8');
for (const selector of ['.party-action-trigger', '.transaction-action-button', '.auth-input', '.auth-submit', '.production-total-panel']) {
  if (!css.includes(selector)) failures.push('index.css: missing required responsive design selector ' + selector);
}
if (!css.includes('@media (hover: none)')) failures.push('index.css: touch-device action visibility rule missing');

const service = fs.readFileSync(path.join(root, 'services/supabaseService.ts'), 'utf8');
if (!service.includes("verifyOtp({") || !service.includes("type: 'recovery'")) failures.push('Password recovery OTP verification is not wired to Supabase.');
if (/Simulate API call|SMS sent successfully|Dummy challenge/.test(files.map(file => fs.readFileSync(file, 'utf8')).join('\n'))) {
  failures.push('A simulated or dummy security/action implementation remains in active source.');
}
if (service.includes("catch (err) { return { parties: [], transactions: []")) {
  failures.push('Data fetch errors must not be converted to empty records.');
}

console.log('Static QA scanned ' + files.length + ' TypeScript files, ' + buttonCount + ' buttons and ' + formCount + ' forms.');
if (failures.length) {
  console.error(failures.map(item => 'FAIL: ' + item).join('\n'));
  process.exit(1);
}
console.log('Static QA passed: every button has a click action or submits a handled form; forms and key mobile/security hooks are present.');
