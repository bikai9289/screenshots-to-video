import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'stv-contact-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${join(dir, 'test.db')}`,
  NODE_ENV: 'test',
});
let service: typeof import('./service');
beforeAll(async () => {
  const client = createClient({ url: process.env.DATABASE_URL! });
  await migrate(drizzle(client), { migrationsFolder: 'drizzle/sqlite' });
  client.close();
  service = await import('./service');
});
afterAll(async () => {
  await (
    await import('@/core/db')
  ).closeDb({
    database_provider: 'sqlite',
    database_url: process.env.DATABASE_URL!,
  });
});
const config = {
  support_email: 'owner@example.test',
  resend_api_key: 'test-placeholder',
  resend_sender_email: 'site@example.test',
};
const input = {
  requestId: '7e6e923f-bc65-41db-8ab7-2f52ad82490c',
  name: 'Visitor',
  email: 'visitor@example.test',
  subject: 'Launch help',
  message: 'I have a question about making my product video.',
  website: '',
};

describe('anonymous contact inbox', () => {
  it('atomically stores concurrent retries once and uses provider idempotency', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ success: true, provider: 'resend' });
    await Promise.all([
      service.submitContact(input, config, send),
      service.submitContact(input, config, send),
    ]);
    const { db } = await import('@/core/db');
    const { ticket, ticketMessage, user } = await import('@/config/db/schema');
    const tickets = await db().select().from(ticket);
    const messages = await db().select().from(ticketMessage);
    expect(tickets).toHaveLength(1);
    expect(messages).toHaveLength(1);
    expect((await db().select().from(user))[0].type).toBe('api');
    expect(send.mock.calls[0][0]).toMatchObject({
      to: config.support_email,
      replyTo: input.email,
      idempotencyKey: `contact-${input.requestId}`,
    });
    expect(send.mock.calls[0][0]).not.toHaveProperty('html');
  });
  it('rejects reuse of a request key with changed content without overwriting it', async () => {
    await expect(
      service.submitContact(
        { ...input, message: 'Different message body' },
        config
      )
    ).rejects.toBeInstanceOf(service.ContactConflictError);
  });
  it('preserves the enquiry when sending fails', async () => {
    const id = '8e6e923f-bc65-41db-8ab7-2f52ad82490c';
    const result = await service.submitContact(
      { ...input, requestId: id },
      config,
      async () => {
        throw new Error('offline');
      }
    );
    expect(result).toMatchObject({
      reference: `contact-${id}`,
      notification: 'pending',
    });
    const { db } = await import('@/core/db');
    const { ticket } = await import('@/config/db/schema');
    expect(await db().select().from(ticket)).toHaveLength(2);
  });
});
