import { describe, expect, it } from 'vitest';

import {
  screenshotLimits,
  screenshotPacks,
} from '@/config/screenshots-product';

import { productDiscovery, publicRobots } from './public-discovery';

describe('public product discovery', () => {
  it('uses current catalog values and separates contact from paid account access', () => {
    const text = productDiscovery('https://example.test/');
    for (const pack of screenshotPacks)
      expect(text).toContain((pack.priceInCents / 100).toFixed(2));
    expect(text).toContain(`up to ${screenshotLimits.maxFiles}`);
    expect(text).toContain('5, 10 or 15 seconds');
    expect(text).toContain('public contact form do not require an account');
    expect(text).not.toContain('Account-based support');
  });
  it('expands full facts with actual examples and realistic storage limits', () => {
    const short = productDiscovery('https://example.test');
    const full = productDiscovery(
      'https://example.test',
      true,
      'support@example.test'
    );
    expect(full.length).toBeGreaterThan(short.length);
    expect(full).toContain('orbit-10s-20261104.mp4');
    expect(full).toContain('orbit-15s-20261104.mp4');
    expect(full).toContain('support@example.test');
    expect(full).toContain(
      'not proof that all copies have been physically deleted'
    );
  });
  it('keeps public content available and protects localized private paths in every bot group', () => {
    const text = publicRobots('https://example.test/');
    const groups = text
      .split(/\n\n/)
      .filter((group) => group.startsWith('User-agent:'));
    expect(
      groups.some((group) => group.startsWith('User-agent: OAI-SearchBot\n'))
    ).toBe(true);
    for (const group of groups) {
      expect(group).toContain('Allow: /');
      expect(group).toContain('Disallow: /zh/admin');
      expect(group).toContain('Disallow: /zh/settings');
      expect(group).toContain('Disallow: /api/');
      if (!group.startsWith('User-agent: *\n'))
        expect(group).not.toContain('Disallow: /studio');
    }
    expect(text).toContain('Sitemap: https://example.test/sitemap.xml');
  });
});
