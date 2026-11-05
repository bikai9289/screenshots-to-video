import { describe, expect, it } from 'vitest';

import { classifyVisit } from './attribution';

describe('privacy-preserving visit attribution', () => {
  it('recognizes ChatGPT source tags even when no referrer is available', () => {
    const visit = classifyVisit(
      'https://screenshotstovideo.com/?utm_source=chatgpt.com&utm_medium=referral',
      ''
    );
    expect(visit.source).toBe('ai');
    expect(visit.utmSource).toBe('chatgpt.com');
    expect(visit.utmMedium).toBe('referral');
  });
  it.each([
    'chatgpt.com',
    'CHATGPT.COM',
    'perplexity.ai',
    'claude.ai',
    'gemini.google.com',
    'copilot.microsoft.com',
  ])('classifies the known AI source %s without a referrer', (source) => {
    expect(
      classifyVisit(`https://screenshotstovideo.com/?utm_source=${source}`, '')
        .source
    ).toBe('ai');
  });
  it('keeps explicit campaign and internal-test attribution ahead of referrers', () => {
    for (const [tag, source] of [
      ['launch', 'campaign'],
      ['internal_test', 'test'],
    ]) {
      expect(
        classifyVisit(
          `https://screenshotstovideo.com/?utm_source=${tag}`,
          'https://chatgpt.com/'
        ).source
      ).toBe(source);
    }
  });
  it('does not treat AI source lookalikes as AI traffic', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/?utm_source=chatgpt.com.attacker.test',
        ''
      ).source
    ).toBe('campaign');
  });
  it('retains an AI referrer when only campaign metadata is supplied', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/?utm_medium=referral&utm_campaign=demo',
        'https://chatgpt.com/'
      ).source
    ).toBe('ai');
  });
  it('does not guess that missing referrers come from AI', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/studio?email=private@example.com',
        ''
      ).source
    ).toBe('unknown');
  });
  it('recognizes actual AI hosts without accepting lookalike domains', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/',
        'https://chatgpt.com/c/private-id'
      ).source
    ).toBe('ai');
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/',
        'https://chatgpt.com.attacker.test/'
      ).source
    ).toBe('referral');
  });
  it('drops queries, fragments, private referrer paths and unknown campaign fields', () => {
    const result = classifyVisit(
      'https://screenshotstovideo.com/studio?utm_source=launch&utm_medium=social&email=secret#private',
      'https://example.com/private?token=secret'
    );
    expect(result).toEqual({
      path: '/studio',
      source: 'campaign',
      referrer: 'example.com',
      utmSource: 'launch',
      utmMedium: 'social',
      utmCampaign: '',
    });
    expect(JSON.stringify(result)).not.toMatch(/secret|token|email|#private/);
  });
  it('ignores unsafe and overly long campaign values', () => {
    expect(
      classifyVisit(
        `https://screenshotstovideo.com/?utm_source=${'a'.repeat(65)}&utm_campaign=person%40example.com`,
        ''
      ).source
    ).toBe('unknown');
  });
  it('marks explicit test visits separately', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/?utm_source=internal_test',
        ''
      ).source
    ).toBe('test');
  });
  it('does not overwrite a source using a same-site referrer', () => {
    expect(
      classifyVisit(
        'https://screenshotstovideo.com/studio',
        'https://screenshotstovideo.com/'
      ).referrer
    ).toBe('');
  });
});
