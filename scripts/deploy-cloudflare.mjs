import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const release = process.argv.slice(2);
if (
  release.length !== 2 ||
  release[0] !== '--release' ||
  !/^release\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(release[1])
) {
  throw new Error(
    'Deploy requires an explicit release tag: pnpm cf:deploy --release release/<version>'
  );
}
const tag = release[1];
const commit = git('rev-parse', 'HEAD');
function assertRelease() {
  if (git('status', '--porcelain'))
    throw new Error('Refusing deployment: working tree is not clean.');
  if (
    git('rev-parse', 'HEAD') !== commit ||
    git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`) !== commit
  ) {
    throw new Error(
      'Refusing deployment: HEAD must match the requested release tag.'
    );
  }
}
assertRelease();
console.log(`Deploying ${tag} at ${commit}`);

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
assertRelease();
await run('node_modules/wrangler/bin/wrangler.js', [
  'deploy',
  '--tag',
  tag.replace('release/', ''),
  '--message',
  `${tag} commit ${commit}`,
]);
