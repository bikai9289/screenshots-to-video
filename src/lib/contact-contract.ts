import { z } from 'zod';

export const contactSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase().max(254),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((s) => !/[\r\n]/.test(s)),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(0).default(''),
});
export type ContactRequest = z.infer<typeof contactSchema>;
