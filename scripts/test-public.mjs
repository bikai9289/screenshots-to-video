import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const directory = await mkdtemp(join(tmpdir(), 'stv-public-'));
const url = `file:${join(directory, 'test.db')}`;
const client = createClient({ url });
await migrate(drizzle(client), { migrationsFolder: 'drizzle/sqlite' });
client.close();
globalThis.gc?.();
const base = 'http://127.0.0.1:3003';
let errors = '';
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: {
    ...process.env,
    PORT: '3003',
    DATABASE_PROVIDER: 'sqlite',
    DATABASE_URL: url,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    AUTH_URL: base,
    AUTH_TRUSTED_ORIGINS: base,
    RESEND_API_KEY: '',
    SEEAPI_API_KEY: '',
    STRIPE_SECRET_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let readyTimer;
try {
  await new Promise((resolve, reject) => {
    readyTimer = setTimeout(
      () => reject(new Error('Public test server did not start on port 3003')),
      30000
    );
    server.once('error', reject);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Listening on:')) resolve();
    });
    server.stderr.on('data', (chunk) => {
      errors += chunk.toString();
    });
    server.once('exit', () =>
      reject(new Error('Public test server exited before readiness'))
    );
  });
  clearTimeout(readyTimer);
  const child = spawn(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      'tests/e2e/home.spec.ts',
      'tests/e2e/ssr.spec.ts',
      'tests/e2e/pricing.spec.ts',
      'tests/e2e/launch-polish.spec.ts',
      'tests/e2e/contact.spec.ts',
      'tests/e2e/discovery.spec.ts',
      'tests/e2e/payment-status.spec.ts',
    ],
    {
      env: { ...process.env, STV_BASE_URL: base },
      stdio: 'inherit',
    }
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (process.exitCode) console.error(errors.slice(-2000));
} finally {
  clearTimeout(readyTimer);
  if (server.exitCode === null) {
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
