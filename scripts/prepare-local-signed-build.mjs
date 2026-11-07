import fs from 'node:fs';

const publicKey = (process.env.EMBROIDERY_UPDATE_PUBLIC_KEY || '').trim();
if (!publicKey.startsWith('untrusted comment:') || !publicKey.includes('RW')) {
  throw new Error('Set EMBROIDERY_UPDATE_PUBLIC_KEY to the Tauri updater public-key file contents.');
}
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  throw new Error('TAURI_SIGNING_PRIVATE_KEY is missing. Use scripts/build-windows-desktop-signed.ps1.');
}
if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  throw new Error('TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing. Use scripts/build-windows-desktop-signed.ps1.');
}

const packageVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const ownerBuild = process.env.EMBROIDERY_OWNER_BUILD === '1';
const configPath = ownerBuild ? 'src-tauri/tauri.owner.conf.json' : 'src-tauri/tauri.conf.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if ((!ownerBuild && packageVersion !== config.version) || cargoVersion !== '1.0.17' || !config.version) {
  throw new Error('package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json versions must match.');
}
if (config.bundle?.createUpdaterArtifacts !== true || !config.plugins?.updater?.endpoints?.length) {
  throw new Error('Tauri updater artifacts or GitHub updater endpoint are not configured.');
}

config.plugins.updater.pubkey = publicKey;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`${ownerBuild ? 'Owner' : 'Customer'} signed build configuration is ready. The private key and passphrase were not written to disk.`);
