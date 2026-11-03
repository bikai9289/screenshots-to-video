import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const directory = await mkdtemp(join(tmpdir(), 'stv-real-auth-'));
const url = `file:${join(directory, 'auth.db')}`;
const client = createClient({ url });
await migrate(drizzle(client), { migrationsFolder: 'drizzle/sqlite' });
client.close();
globalThis.gc?.();
const base = 'http://127.0.0.1:3002';
// Use only an isolated database and generated local auth secret, never configured provider credentials.
const environment = {
  ...process.env,
  PORT: '3002',
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: url,
  AUTH_SECRET: randomBytes(32).toString('hex'),
  AUTH_URL: base,
  AUTH_TRUSTED_ORIGINS: base,
  RESEND_API_KEY: '',
  SEEAPI_API_KEY: '',
  STRIPE_SECRET_KEY: '',
};
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: environment,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let exited = false;
let listening = false;
server.stdout.on('data', chunk => { if(chunk.toString().includes('Listening on:')) listening=true; });
server.stderr.on('data', () => {});
server.on('error', () => { exited=true; });
server.on('exit', () => {
  exited = true;
});
try {
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline && !exited) {
    try {
      const response = listening ? await fetch(base, { signal: AbortSignal.timeout(1500) }) : null;
      if (response?.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready)
    throw new Error(
      'Isolated auth server did not start; check that port 3002 is free.'
    );
  const tests = spawn(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      'tests/e2e/real-auth.spec.ts',
    ],
    {
      env: { ...process.env, STV_BASE_URL: base, STV_REAL_AUTH_TEST: '1' },
      stdio: 'inherit',
    }
  );
  const code = await new Promise((resolve, reject) => {
    tests.on('error', reject);
    tests.on('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = code;
} finally {
  if (!exited) {
    const stopped = new Promise((resolve) => server.once('exit', resolve));
    server.kill();
    await stopped;
  }
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
