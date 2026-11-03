import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (!existsSync('.env.development')) {
  writeFileSync('.env.development', [
    'VITE_APP_URL=http://localhost:3000',
    'VITE_APP_NAME=Screenshots to Video',
    'VITE_APP_DESCRIPTION=Turn product screenshots into demo and launch videos. Paid access required.',
    'DATABASE_PROVIDER=sqlite',
    'DATABASE_URL=file:data/local.db',
    `AUTH_SECRET=${randomBytes(32).toString('hex')}`,
    '',
  ].join('\n'));
  console.log('Created local development environment with a generated auth secret.');
} else {
  console.log('Existing development environment preserved.');
}
mkdirSync('data', { recursive: true });
