import { useEffect } from 'react';

import { useSession } from '@/core/auth/client';
import { classifyVisit, type VisitAttribution } from '@/lib/attribution';
import { track } from '@/lib/track';

const firstKey = 'stv:first-touch';
const visitKey = 'stv:visit';
type StoredVisit = { at: number; value: VisitAttribution };

function readVisit(
  storage: Storage,
  key: string,
  lifetime: number
): StoredVisit | null {
  try {
    const saved = JSON.parse(
      storage.getItem(key) ?? 'null'
    ) as StoredVisit | null;
    if (
      !saved ||
      typeof saved.at !== 'number' ||
      saved.at > Date.now() ||
      Date.now() - saved.at > lifetime ||
      !saved.value
    )
      return null;
    const value = saved.value;
    if (
      !['ai', 'search', 'campaign', 'referral', 'unknown', 'test'].includes(
        value.source
      )
    )
      return null;
    if (
      Object.values(value).some(
        (item) => typeof item !== 'string' || item.length > 200
      )
    )
      return null;
    return saved;
  } catch {
    return null;
  }
}

export function ProductAttribution({ allowed }: { allowed: boolean }) {
  const { data: session } = useSession();
  useEffect(() => {
    try {
      if (!allowed) {
        localStorage.removeItem(firstKey);
        sessionStorage.removeItem(visitKey);
        return;
      }
      const now = Date.now();
      const current = classifyVisit(location.href, document.referrer);
      const storedFirst = readVisit(
        localStorage,
        firstKey,
        30 * 24 * 60 * 60 * 1000
      );
      const first = storedFirst ?? { at: now, value: current };
      if (!storedFirst) localStorage.setItem(firstKey, JSON.stringify(first));
      const storedVisit = readVisit(sessionStorage, visitKey, 30 * 60 * 1000);
      const visit = storedVisit ?? { at: now, value: current };
      sessionStorage.setItem(visitKey, JSON.stringify(visit));
      if (!session?.user.id) return;
      const reported = `stv:reported:${session.user.id}:${visit.at}`;
      if (sessionStorage.getItem(reported)) return;
      track('visit_attributed', {
        ...visit.value,
        firstSource: first.value.source,
        firstReferrer: first.value.referrer,
      });
      sessionStorage.setItem(reported, '1');
    } catch {
      /* Analytics must not affect rendering, login or payments. */
    }
  }, [allowed, session?.user.id]);
  return null;
}
