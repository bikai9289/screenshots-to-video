import { m } from '@/paraglide/messages.js';

/** Map upload-image API error messages to localized UI copy. */
export function resolveUploadImageErrorMessage(
  message?: string | null
): string {
  if (!message) return m['stp.common.image_upload_failed']();
  if (/image too large/i.test(message)) {
    return m['stp.common.image_size_limit_exceeded']();
  }
  return message;
}

export function isUploadUnauthorized(
  message?: string | null,
  status?: number
): boolean {
  return status === 401 || message === 'Unauthorized';
}
