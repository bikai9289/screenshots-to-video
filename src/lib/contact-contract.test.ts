import { describe, expect, it } from 'vitest';

import { contactSchema } from './contact-contract';

const valid = {
  requestId: '7e6e923f-bc65-41db-8ab7-2f52ad82490c',
  name: 'Demo visitor',
  email: 'visitor@example.test',
  subject: 'Before purchasing',
  message: 'Can I use a vertical video for my launch?',
  website: '',
};
describe('public contact validation', () => {
  it('accepts bounded contact information', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    { email: 'victim@example.test\r\nBcc: another@example.test' },
    { website: 'spam' },
    { message: 'x'.repeat(4001) },
    { name: '' },
    { subject: 'a\r\nb' },
    { requestId: '../admin' },
    { subject: '' },
    { message: '' },
    { email: '' },
  ])('rejects malformed, excessive or automated submissions: %o', (change) => {
    expect(contactSchema.safeParse({ ...valid, ...change }).success).toBe(
      false
    );
  });
});
