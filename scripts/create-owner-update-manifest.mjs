import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(fs.readFileSync('src-tauri/tauri.owner.conf.json', 'utf8'));
const version = config.version;
const bundleDir = path.resolve('src-tauri/target/release/bundle/nsis');
if (!fs.existsSync(bundleDir)) throw new Error('Owner NSIS bundle folder was not found. Build the signed Owner installer first.');

const installers = fs.readdirSync(bundleDir)
  .filter((name) => /owner control center.*\.exe$/i.test(name))
  .map((name) => path.join(bundleDir, name));
if (installers.length !== 1) {
  throw new Error(`Expected exactly one Owner Control Center installer, found ${installers.length}. Check: ${bundleDir}`);
}

const installer = installers[0];
const signaturePath = `${installer}.sig`;
if (!fs.existsSync(signaturePath)) throw new Error(`Matching updater signature is missing: ${signaturePath}`);
const signature = fs.readFileSync(signaturePath, 'utf8').trim();
if (!signature) throw new Error('The updater signature file is empty.');

const assetName = path.basename(installer);
const manifest = {
  version,
  notes: 'Embroidery Statement Owner Control Center update.',
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64-nsis': {
      signature,
      url: `https://github.com/emonak71-sketch/EMBRODERY-STATMENT/releases/download/v${version}/${encodeURIComponent(assetName).replace(/%2F/g, '/')}`
    }
  }
};

fs.writeFileSync('latest-owner.json', JSON.stringify(manifest, null, 2) + '\\n');
console.log('Created latest-owner.json for version ' + version);
console.log('Upload these three files to GitHub Release v' + version + ':');
console.log('  ' + installer);
console.log('  ' + signaturePath);
console.log('  latest-owner.json');
