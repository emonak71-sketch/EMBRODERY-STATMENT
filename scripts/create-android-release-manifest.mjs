import fs from 'node:fs';
import crypto from 'node:crypto';

const [apkPath, releaseTag, repository] = process.argv.slice(2);
if (!apkPath || !releaseTag || !repository) {
  throw new Error('Usage: node scripts/create-android-release-manifest.mjs <apk-path> <vX.Y.Z> <owner/repository>');
}
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
if (releaseTag !== 'v' + version) {
  throw new Error('Android release tag ' + releaseTag + ' does not match package version v' + version + '.');
}
if (!fs.existsSync(apkPath)) throw new Error('Signed APK not found: ' + apkPath);

const apk = fs.readFileSync(apkPath);
const sha256 = crypto.createHash('sha256').update(apk).digest('hex');
const apkUrl = 'https://github.com/' + repository + '/releases/download/' + releaseTag + '/Embroidery-Statement-Android.apk';
const manifest = {
  version,
  notes: 'Embroidery Statement ' + version + ' — Android customer app update.',
  pub_date: new Date().toISOString(),
  apk_url: apkUrl,
  sha256,
  package_id: 'com.embroidery.statement'
};
fs.writeFileSync('latest-android.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared latest-android.json for ' + version + ' (SHA-256 ' + sha256 + ').');
