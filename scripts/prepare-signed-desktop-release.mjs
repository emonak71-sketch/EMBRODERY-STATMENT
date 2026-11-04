import fs from 'node:fs';

const configFile = 'src-tauri/tauri.conf.json';
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const publicKey = (process.env.EMBROIDERY_UPDATE_PUBLIC_KEY || '').trim();
const version = config.version;
const tag = process.env.GITHUB_REF_NAME || '';

if (!publicKey.startsWith('untrusted comment:') || !publicKey.includes('RW')) {
  throw new Error('Set the real Tauri signer PUBLIC KEY as GitHub repository variable EMBROIDERY_UPDATE_PUBLIC_KEY before releasing.');
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
const cargoVersion = cargoToml.match(/^version\\s*=\\s*"([^"]+)"/m)?.[1];
if (packageVersion !== version || cargoVersion !== version) {
  throw new Error('package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json versions must match');
}
config.plugins.updater.pubkey = publicKey;
fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');
console.log('Tauri updater public key configured; version validated: '+version);
