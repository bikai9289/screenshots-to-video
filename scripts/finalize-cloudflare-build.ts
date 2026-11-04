import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function finalizeCloudflareBuild(serverDir: string) {
  const configPath = join(serverDir, 'wrangler.json');
  if (!existsSync(configPath))
    throw new Error('Cloudflare output config is missing');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config.main === 'worker-entry.mjs') return;
  if (config.main !== 'index.mjs')
    throw new Error('Unexpected Cloudflare entry; refusing to rewrite it');
  // Nitro may share exports through index.mjs. Workers treats every export on
  // its entry as a handler, so constants/tables must stay on an internal module.
  writeFileSync(
    join(serverDir, 'worker-entry.mjs'),
    "export { default, ProviderGenerateRateLimiter } from './index.mjs';\n"
  );
  config.main = 'worker-entry.mjs';
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// Run after Nitro's complete build, without overriding its preset hooks.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  existsSync('.output/server/wrangler.json')
) {
  finalizeCloudflareBuild('.output/server');
}
