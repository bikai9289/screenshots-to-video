import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

// Node's env parser handles quoted names and leaves deployment-provided values
// intact. Credentials stay in the environment, never in command arguments.
if (existsSync('.env.production')) process.loadEnvFile('.env.production');
const environment = { ...process.env, NITRO_PRESET: 'cloudflare_module' };

async function run(script, args = []) {
  const child = spawn(process.execPath, [script, ...args], {
    env: environment,
    stdio: 'inherit',
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status) => resolve(status ?? 1));
  });
  if (code !== 0) process.exit(code);
}

await run('scripts/db-setup.mjs');
await run('node_modules/vite/bin/vite.js', ['build']);
await run('node_modules/tsx/dist/cli.mjs', [
  'scripts/finalize-cloudflare-build.ts',
]);
await run('node_modules/wrangler/bin/wrangler.js', ['deploy']);
