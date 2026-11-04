import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { finalizeCloudflareBuild } from '../../scripts/finalize-cloudflare-build';

it('keeps internal shared exports off the Worker handler entry and preserves bindings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stv-worker-entry-'));
  try {
    const config = {
      main: 'index.mjs',
      vars: { DATABASE_PROVIDER: 'd1' },
      triggers: { crons: ['0 16 * * *'] },
    };
    writeFileSync(join(dir, 'wrangler.json'), JSON.stringify(config));
    finalizeCloudflareBuild(dir);
    finalizeCloudflareBuild(dir);
    expect(
      JSON.parse(readFileSync(join(dir, 'wrangler.json'), 'utf8'))
    ).toEqual({ ...config, main: 'worker-entry.mjs' });
    expect(readFileSync(join(dir, 'worker-entry.mjs'), 'utf8')).toBe(
      "export { default, ProviderGenerateRateLimiter } from './index.mjs';\n"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
