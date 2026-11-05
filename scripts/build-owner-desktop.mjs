import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  command,
  ['--yes', '@tauri-apps/cli@2', 'build', '--config', 'src-tauri/tauri.owner.conf.json'],
  { stdio: 'inherit', env: { ...process.env, EMBROIDERY_OWNER_BUILD: '1' } },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
