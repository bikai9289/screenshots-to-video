import { readFileSync } from 'node:fs';

// IndexNow keys are public site-ownership proofs, not account credentials.
const origin = 'https://screenshotstovideo.com';
const key = 'fa884d5836b34734890f7c8541ab08da';
const paths = [
  '/',
  '/pricing',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/screenshot-to-demo-video',
  '/screenshot-to-app-store-preview-video',
  '/feature-announcement-video',
];
const urlList = paths.flatMap((path) => [
  origin + path,
  origin + (path === '/' ? '/zh' : '/zh' + path),
]);
const keyLocation = `${origin}/${key}.txt`;
if (readFileSync(`public/${key}.txt`, 'utf8').trim() !== key)
  throw new Error('IndexNow key file mismatch');
const payload = { host: new URL(origin).host, key, keyLocation, urlList };
if (!process.argv.includes('--submit')) {
  console.log(JSON.stringify(payload, null, 2));
  console.log(
    'Dry run. Deploy first, then pass --submit. Submission does not guarantee indexing.'
  );
} else {
  const proof = await fetch(keyLocation, {
    signal: AbortSignal.timeout(15000),
  });
  if (!proof.ok || (await proof.text()).trim() !== key)
    throw new Error(
      'Live IndexNow proof is missing; deploy the public key first'
    );
  for (const url of urlList) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 200)
      throw new Error(`Not submitting: ${url} returned ${response.status}`);
  }
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (![200, 202].includes(response.status))
    throw new Error(`IndexNow rejected submission: HTTP ${response.status}`);
  console.log(
    `IndexNow accepted ${urlList.length} URLs (HTTP ${response.status}); indexing is not guaranteed.`
  );
}
