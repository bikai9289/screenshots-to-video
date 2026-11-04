import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();
const unknown = process.argv.slice(2).filter((value) => value !== '--apply');
if (unknown.length) throw new Error('Usage: maintain-screenshots.ts [--apply]');
const { maintainScreenshots } =
  await import('../src/server/screenshots-maintenance');
const result = await maintainScreenshots(process.argv.includes('--apply'));
console.log(JSON.stringify(result));
if (result.failed) process.exitCode = 1;
