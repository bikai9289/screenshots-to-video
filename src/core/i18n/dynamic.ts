import { m } from '@/paraglide/messages.js';

// Dynamic message lookup for keys built at runtime (tab labels, keyed
// lists). Prefer static `m["ns.key"]()` whenever the key is known —
// dynamic access opts the whole message bundle out of tree-shaking.
export function tDynamic(key: string, fallback?: string): string {
  const fn = (m as Record<string, unknown>)[key];
  if (typeof fn === 'function') {
    return (fn as () => string)();
  }
  return fallback !== undefined ? fallback : key;
}
