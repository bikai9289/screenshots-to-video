import { and, eq } from 'drizzle-orm';

import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import {
  ResendProvider,
  type EmailMessage,
  type EmailSendResult,
} from '@/core/email';
import { ticket, ticketMessage, user } from '@/config/db/schema';
import type { ContactRequest } from '@/lib/contact-contract';

const inboxId = 'system-public-contact';
const inboxEmail = 'public-contact@screenshotstovideo.invalid';
export class ContactConflictError extends Error {}

export async function submitContact(
  input: ContactRequest,
  config: Record<string, string>,
  send?: (message: EmailMessage) => Promise<EmailSendResult>
) {
  const id = `contact-${input.requestId}`;
  const messageId = `${id}-initial`;
  const title = `[Contact] ${input.subject}`;
  const content = `From: ${input.name}\nEmail: ${input.email}\n\n${input.message}`;
  const now = new Date();
  try {
    await atomic((q) => [
      q
        .insert(user)
        .values({
          id: inboxId,
          name: 'Website enquiries',
          email: inboxEmail,
          type: 'api',
          emailVerified: false,
        })
        .onConflictDoNothing(),
      guard({
        table: user,
        column: 'id',
        where: eq(user.id, inboxId),
        require: and(eq(user.type, 'api'), eq(user.email, inboxEmail))!,
        message: 'Invalid contact inbox',
      }),
      q
        .insert(ticket)
        .values({
          id,
          userId: inboxId,
          title,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing(),
      guard({
        table: ticket,
        column: 'id',
        where: eq(ticket.id, id),
        require: and(eq(ticket.userId, inboxId), eq(ticket.title, title))!,
        message: 'Contact request changed',
      }),
      q
        .insert(ticketMessage)
        .values({
          id: messageId,
          ticketId: id,
          userId: inboxId,
          role: 'user',
          content,
          attachments: '[]',
          createdAt: now,
        })
        .onConflictDoNothing(),
      guard({
        table: ticketMessage,
        column: 'id',
        where: eq(ticketMessage.id, messageId),
        require: and(
          eq(ticketMessage.ticketId, id),
          eq(ticketMessage.content, content)
        )!,
        message: 'Contact request changed',
      }),
    ]);
  } catch (error) {
    if (error instanceof AtomicGuardError) throw new ContactConflictError();
    throw error;
  }
  const recipient = (config.support_email || '').trim();
  if (!recipient || !config.resend_api_key || !config.resend_sender_email) {
    return { reference: id, notification: 'pending' as const };
  }
  try {
    const sender =
      send ??
      ((message) =>
        new ResendProvider({
          apiKey: config.resend_api_key,
          defaultFrom: config.resend_sender_email,
        }).sendEmail(message));
    const result = await sender({
      to: recipient,
      replyTo: input.email,
      subject: title,
      text: `${content}\n\nReference: ${id}`,
      idempotencyKey: id,
    });
    return {
      reference: id,
      notification: result.success ? ('sent' as const) : ('pending' as const),
    };
  } catch {
    // The enquiry remains in the admin ticket inbox even if email is offline.
    return { reference: id, notification: 'pending' as const };
  }
}
