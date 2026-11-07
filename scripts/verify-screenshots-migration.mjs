import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const directory = await mkdtemp(join(tmpdir(), 'stv-migration-'));
const client = createClient({ url: `file:${join(directory, 'test.db')}` });
try {
  const database = drizzle(client);
  await migrate(database, { migrationsFolder: 'drizzle/sqlite' });
  const tables = (
    await client.execute("select name from sqlite_master where type='table'")
  ).rows.map((row) => row.name);
  if (
    !tables.includes('screenshot_asset') ||
    !tables.includes('screenshot_task') ||
    !tables.includes('screenshot_credit_allocation') ||
    !tables.includes('order')
  )
    throw new Error('Required tables missing');
  if ((await client.execute('pragma foreign_key_check')).rows.length)
    throw new Error('Foreign key check failed');
  // Applying again must use the journal instead of trying to recreate existing tables.
  await migrate(database, { migrationsFolder: 'drizzle/sqlite' });
  console.log(
    'SQLite baseline migration and idempotent rerun passed on an isolated database.'
  );
} finally {
  client.close();
  globalThis.gc?.();
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
