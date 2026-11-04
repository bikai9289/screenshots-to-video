# Public contact endpoint

`POST /api/contact` accepts same-origin JSON without authentication. The body is limited to 24 KiB. No arbitrary recipient or attachment is accepted.

| Field     | Requirement                                                                   |
| --------- | ----------------------------------------------------------------------------- |
| requestId | Required UUID; reuse for an unchanged retry, generate a new one after editing |
| name      | Required, trimmed, 1–80 characters                                            |
| email     | Required valid email, normalized to lowercase, maximum 254 characters         |
| subject   | Required, 1–120 characters, no CR or LF                                       |
| message   | Required, 10–4000 characters                                                  |
| website   | Optional honeypot, must be empty                                              |

Success uses the standard `{code: 0, message: 'ok', data: {reference, notification}}` envelope. `notification` is `sent` when the provider accepts the message, not proof of inbox delivery, or `pending` when the enquiry is saved but email was unavailable. The browser shows a reference and recovery state. It never receives provider credentials or internal email errors.

| Code | HTTP      | Meaning                                                         |
| ---- | --------- | --------------------------------------------------------------- |
| 4701 | 403       | Missing or foreign Origin                                       |
| 4702 | 400 / 413 | Invalid JSON, content type, fields, honeypot, or excessive body |
| 4703 | 429       | IP interval or durable hourly limit reached                     |
| 4704 | 409       | Reused request ID with different enquiry content                |
| 4705 | 503       | Enquiry could not be saved; no success is claimed               |

Limits are 30 seconds between attempts per IP in an isolate and five valid submissions per hour per hashed IP in the existing Durable Object limiter. Stored requests are atomic and duplicate-safe. The API-type system inbox is not a visitor registration and has no password, sessions, roles, or agent keys. Existing admin ticket permissions protect all reads. Replies to anonymous enquiries should be sent by email using the validated Reply-To in the support notification.

Configuration stays in the environment: `VITE_SUPPORT_EMAIL`, `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`. The website's public support alias forwards to the owner's verified Gmail through Cloudflare Email Routing. Resend sending and inbound routing are separate services; verify actual delivery independently of API acceptance.
