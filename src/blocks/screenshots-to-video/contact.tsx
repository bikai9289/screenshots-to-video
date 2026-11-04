import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { envConfigs } from '@/config';
import { ApiError, apiPost } from '@/lib/api-client';
import { contactSchema } from '@/lib/contact-contract';
import { TextField } from '@/components/form-field';
import { ScreenshotContact } from '@/components/screenshots-to-video/contact';

import { useScreenshotsCopy } from './use-copy';

export function ScreenshotsContact() {
  const copy = useScreenshotsCopy();
  const email = envConfigs.support_email.trim();
  const supportEmail = /^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email)
    ? email
    : undefined;
  const request = useRef<{ key: string; payload: string } | null>(null);
  const [reference, setReference] = useState('');
  const mutation = useMutation({
    mutationFn: (value: {
      name: string;
      email: string;
      subject: string;
      message: string;
      website: string;
    }) => {
      const payload = JSON.stringify(value);
      if (request.current?.payload !== payload)
        request.current = { key: crypto.randomUUID(), payload };
      return apiPost<{ reference: string }>('/api/contact', {
        ...value,
        requestId: request.current.key,
      });
    },
    onSuccess: (result) => {
      setReference(result.reference);
      request.current = null;
    },
  });
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      website: '',
    },
    validators: {
      onSubmit: contactSchema
        .omit({ requestId: true })
        .extend({ website: z.string().max(0) }),
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value).catch(() => {});
    },
  });
  const content = reference ? (
    <div className="contact-form contact-success" role="status">
      <span className="contact-success-mark" aria-hidden="true">
        ✓
      </span>
      <h2>{copy.contactSentTitle}</h2>
      <p>{copy.contactSentDescription}</p>
      <p className="contact-reference">
        {copy.contactReference}: {reference}
      </p>
      <button
        className="button dark"
        type="button"
        onClick={() => {
          setReference('');
          form.reset();
          mutation.reset();
        }}
      >
        {copy.contactAnother}
      </button>
    </div>
  ) : (
    <form
      className="contact-form"
      method="post"
      action="/api/contact"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="contact-fields-row">
        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              label={copy.contactName}
              autoComplete="name"
              required
              disabled={mutation.isPending}
            />
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <TextField
              field={field}
              label={copy.contactEmail}
              type="email"
              autoComplete="email"
              required
              disabled={mutation.isPending}
            />
          )}
        </form.Field>
      </div>
      <form.Field name="subject">
        {(field) => (
          <TextField
            field={field}
            label={copy.contactSubject}
            required
            disabled={mutation.isPending}
          />
        )}
      </form.Field>
      <form.Field name="message">
        {(field) => (
          <div className="contact-message-field">
            <label htmlFor="contact-message">{copy.contactMessage}</label>
            <textarea
              id="contact-message"
              name="message"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
              minLength={10}
              maxLength={4000}
              rows={6}
              disabled={mutation.isPending}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="website">
        {(field) => (
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        )}
      </form.Field>
      <p className="contact-form-note">{copy.contactPrivacyNote}</p>
      {mutation.isError && (
        <p role="alert">
          {mutation.error instanceof ApiError && mutation.error.code === 4703
            ? copy.contactRateLimited
            : copy.contactSendFailed}
        </p>
      )}
      <button
        className="button dark large"
        type="submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? copy.contactSending : copy.contactSend}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
  return (
    <ScreenshotContact copy={copy} supportEmail={supportEmail} form={content} />
  );
}
