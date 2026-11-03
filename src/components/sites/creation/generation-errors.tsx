'use client';

import React from 'react';

import { sanitizeUserErrorMessage } from '@/core/ai/types';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function formatLocalizedErrorMessage(errMsg?: string): React.ReactNode {
  if (!errMsg) return m['stp.common.generation_failed']();
  const errorCodeMap: Record<string, string> = {
    copyright_restricted: 'stp.common.copyright_restricted',
    content_safety_rejected: 'stp.common.content_safety_rejected',
    reference_media_duration_invalid:
      'stp.multimodal.reference_media_duration_invalid',
    too_many_images: 'stp.common.too_many_images',
    too_many_videos: 'stp.common.too_many_videos',
    too_many_audios: 'stp.common.too_many_audios',
    prompt_too_long: 'stp.common.prompt_too_long',
    service_busy: 'stp.common.service_busy',
    reference_media_invalid: 'stp.common.reference_media_invalid',
    task_canceled: 'stp.common.task_canceled',
    generation_failed: 'stp.common.generation_failed',
  };
  if (errorCodeMap[errMsg]) {
    return ((m as any)[errorCodeMap[errMsg]] as () => React.ReactNode)();
  }
  const creditMatch = errMsg.match(
    /insufficient\s+credits\s*\(requires\s*(\d+)[^,]*,\s*current\s*balance:?\s*(\d+)\)/i
  );
  if (creditMatch)
    return (
      <span>
        {m['stp.common.insufficient_credits_prefix']({
          cost: creditMatch[1],
          balance: creditMatch[2],
        })}
        <Link
          href="/pricing"
          className="font-medium underline transition-opacity hover:opacity-80"
        >
          {m['stp.common.purchase_credits_action']()}
        </Link>
        {m['stp.common.insufficient_credits_suffix']()}
      </span>
    );
  if (/insufficient\s+credits/i.test(errMsg))
    return (
      <span>
        {m['stp.common.insufficient_credits_simple_prefix']()}
        <Link
          href="/pricing"
          className="font-medium underline transition-opacity hover:opacity-80"
        >
          {m['stp.common.purchase_credits_action']()}
        </Link>
        {m['stp.common.insufficient_credits_suffix']()}
      </span>
    );
  const map: Array<[RegExp, string]> = [
    [/copyright|copyright restrictions/i, 'stp.common.copyright_restricted'],
    [
      /content safety|sensitive content|flagged as sensitive|policy\s*violation|moderation|safety system|content policy/i,
      'stp.common.content_safety_rejected',
    ],
    [
      /duration\s+must\s+be\s+between|total\s+duration.*(?:exceed|maximum)/i,
      'stp.multimodal.reference_media_duration_invalid',
    ],
    [/too\s+many\s+input\s+images/i, 'stp.common.too_many_images'],
    [/too\s+many\s+input\s+videos/i, 'stp.common.too_many_videos'],
    [/too\s+many\s+input\s+audio/i, 'stp.common.too_many_audios'],
    [/prompt\s+is\s+too\s+long/i, 'stp.common.prompt_too_long'],
    [
      /rate\s*limit|too\s+many\s+requests|queue\s+is\s+full|service\s+unavailable|overloaded|temporarily\s+busy/i,
      'stp.common.service_busy',
    ],
    [
      /(?:failed|unable)\s+to\s+(?:download|fetch|prepare).*(?:image|video|audio|reference)|(?:image|video|audio).*(?:format.*unsupported|file.*too large|unavailable|invalid)/i,
      'stp.common.reference_media_invalid',
    ],
    [/task\s+canceled|cancelled/i, 'stp.common.task_canceled'],
    [
      /internal server error|failed to generate|generation failed|unexpected error/i,
      'stp.common.generation_failed',
    ],
  ];
  for (const [re, key] of map) {
    if (re.test(errMsg)) {
      return ((m as any)[key] as () => React.ReactNode)();
    }
  }
  const singleDurationMatch = errMsg.match(
    /(image|video|audio)\s*#(\d+)\s*duration\s*(\d+(?:\.\d+)?)\s*s/i
  );
  if (singleDurationMatch) {
    return m['stp.multimodal.media_duration_invalid']({
      type: singleDurationMatch[1],
      index: singleDurationMatch[2],
      duration: singleDurationMatch[3],
      min: '2',
      max: '10',
    });
  }
  const totalDurationMatch = errMsg.match(
    /total\s*(image|video|audio)\s*duration\s*(\d+(?:\.\d+)?)\s*s/i
  );
  if (totalDurationMatch) {
    return m['stp.multimodal.media_total_duration_exceeded']({
      type: totalDurationMatch[1],
      duration: totalDurationMatch[2],
      max: '15',
    });
  }
  const cleaned = sanitizeUserErrorMessage(errMsg);
  if (cleaned.includes('temporarily busy')) {
    return m['stp.common.service_busy']();
  }
  return cleaned;
}
