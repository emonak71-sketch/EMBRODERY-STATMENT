import fs from 'node:fs';

const requested = process.argv[2];
if (!requested) {
  console.error('Usage: node scripts/bump-version.mjs <patch|minor|major|X.Y.Z>');
  process.exit(1);
}

const packagePath = 'package.json';
const lockPath = 'package-lock.json';
const cargoPath = 'src-tauri/Cargo.toml';
const tauriConfigPath = 'src-tauri/tauri.conf.json';
const ownerTauriConfigPath = 'src-tauri/tauri.owner.conf.json';
const appVersionPath = 'desktop/appVersion.ts';
const cargoLockPath = 'src-tauri/Cargo.lock';

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const current = packageJson.version;
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!match) throw new Error('Current package version is not semantic X.Y.Z: ' + current);

let next;
if (requested === 'major') next = `${Number(match[1]) + 1}.0.0`;
else if (requested === 'minor') next = `${match[1]}.${Number(match[2]) + 1}.0`;
else if (requested === 'patch') next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
else if (/^\d+\.\d+\.\d+$/.test(requested)) next = requested;
else throw new Error('Version must be patch, minor, major or an explicit X.Y.Z value.');

if (next === current) throw new Error('The requested version is already current.');

packageJson.version = next;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

const packageLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
packageLock.version = next;
if (packageLock.packages?.['']) packageLock.packages[''].version = next;
fs.writeFileSync(lockPath, JSON.stringify(packageLock, null, 2) + '\n');

let cargoToml = fs.readFileSync(cargoPath, 'utf8');
const cargoVersionLine = /^version\s*=\s*"[^"]+"/m;
if (!cargoVersionLine.test(cargoToml)) throw new Error('Could not locate the [package] version in Cargo.toml.');
cargoToml = cargoToml.replace(cargoVersionLine, `version = "${next}"`);
fs.writeFileSync(cargoPath, cargoToml);

const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
tauriConfig.version = next;
fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');

if (fs.existsSync(ownerTauriConfigPath)) {
  const ownerConfig = JSON.parse(fs.readFileSync(ownerTauriConfigPath, 'utf8'));
  ownerConfig.version = next;
  fs.writeFileSync(ownerTauriConfigPath, JSON.stringify(ownerConfig, null, 2) + '\n');
}
if (fs.existsSync(appVersionPath)) {
  fs.writeFileSync(appVersionPath, `// Keep synchronized by scripts/bump-version.mjs.\nexport const APP_VERSION = '${next}';\n`);
}

if (fs.existsSync(cargoLockPath)) {
  let cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
  const packageEntry = /(\[\[package\]\]\s*\nname = "embroidery_statement"\s*\nversion = ")[^"]+(")/;
  if (packageEntry.test(cargoLock)) {
    cargoLock = cargoLock.replace(packageEntry, `$1${next}$2`);
    fs.writeFileSync(cargoLockPath, cargoLock);
  }
}

console.log(`Version updated: ${current} -> ${next}`);
console.log(`Next release tag: v${next}`);
console.log('Customer, Owner and Android app versions are synchronized.');
console.log('Review the changelog and run the source checks before creating the release tag.');
