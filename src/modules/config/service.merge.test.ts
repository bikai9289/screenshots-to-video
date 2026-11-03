import { describe, expect, it } from 'vitest';

import { pickNonEmptyEnvConfigs } from './service';

describe('pickNonEmptyEnvConfigs', () => {
  it('keeps only non-empty trimmed strings', () => {
    expect(
      pickNonEmptyEnvConfigs({
        stripe_secret_key: 'sk_test_x',
        stripe_enabled: 'true',
        empty: '',
        spaces: '   ',
        r2_bucket_name: 'screenshots-to-video-private',
      })
    ).toEqual({
      stripe_secret_key: 'sk_test_x',
      stripe_enabled: 'true',
      r2_bucket_name: 'screenshots-to-video-private',
    });
  });

  it('lets env overlay win over db when merged', () => {
    const db = {
      stripe_secret_key: 'sk_from_db',
      seeapi_api_key: 'see_from_db',
      mock: '1',
    };
    const env = pickNonEmptyEnvConfigs({
      stripe_secret_key: 'sk_from_env',
      seeapi_api_key: '',
      r2_access_key: 'ak',
    });
    expect({ ...db, ...env }).toEqual({
      stripe_secret_key: 'sk_from_env',
      seeapi_api_key: 'see_from_db',
      mock: '1',
      r2_access_key: 'ak',
    });
  });
});
