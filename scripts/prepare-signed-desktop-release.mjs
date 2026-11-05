import fs from 'node:fs';

const configFile = 'src-tauri/tauri.conf.json';
const ownerConfigFile = 'src-tauri/tauri.owner.conf.json';
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const ownerConfig = JSON.parse(fs.readFileSync(ownerConfigFile, 'utf8'));
const publicKey = (process.env.EMBROIDERY_UPDATE_PUBLIC_KEY || '').trim();
const version = config.version;
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || '';

let publicKeyText = '';
try {
  const compactPublicKey = publicKey.replace(/\s+/g, '');
  const decodedPublicKey = Buffer.from(compactPublicKey, 'base64');
  if (!compactPublicKey || decodedPublicKey.toString('base64').replace(/=+$/, '') !== compactPublicKey.replace(/=+$/, '')) {
    throw new Error('Invalid Base64 encoding');
  }
  publicKeyText = decodedPublicKey.toString('utf8');
} catch {
  throw new Error('EMBROIDERY_UPDATE_PUBLIC_KEY is not a valid Base64-encoded Tauri public key.');
}
const publicKeyLines = publicKeyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const minisignPayload = publicKeyLines.find((line) => /^RW[A-Za-z0-9+/]{54}$/.test(line));
if (
  !publicKeyLines[0]?.startsWith('untrusted comment: minisign public key:') ||
  !minisignPayload ||
  Buffer.from(minisignPayload, 'base64').length !== 42 ||
  Buffer.from(minisignPayload, 'base64').subarray(0, 2).toString('ascii') !== 'Ed'
) {
  throw new Error('EMBROIDERY_UPDATE_PUBLIC_KEY does not contain a valid Tauri Minisign public-key box.');
}
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  throw new Error('Set TAURI_SIGNING_PRIVATE_KEY as a GitHub Actions SECRET before releasing.');
}
if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  throw new Error('Set TAURI_SIGNING_PRIVATE_KEY_PASSWORD as a GitHub Actions SECRET before releasing.');
}
if (!/^v\d+\.\d+\.\d+$/.test(tag) || tag !== 'v' + version) {
  throw new Error('Release tag ' + tag + ' does not match app version v' + version);
}

const packageVersion = JSON.parse(fs.readFileSync('package.json','utf8')).version;
const cargoToml = fs.readFileSync('src-tauri/Cargo.toml','utf8');
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (packageVersion !== version || cargoVersion !== version || ownerConfig.version !== version) {
  throw new Error('package.json, Cargo.toml, customer Tauri config and owner Tauri config versions must match');
}
config.plugins.updater.pubkey = publicKey;
ownerConfig.plugins.updater.pubkey = publicKey;
fs.writeFileSync(configFile, JSON.stringify(config,null,2)+'\n');
fs.writeFileSync(ownerConfigFile, JSON.stringify(ownerConfig,null,2)+'\n');
console.log('Customer and Owner Tauri updater public keys configured; shared release version validated: '+version);
