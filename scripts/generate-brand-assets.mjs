import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Raster exports share the exact SVG used by the website and browser tab.
const svg = await fs.readFile('public/logo.svg', 'utf8');
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : undefined,
});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [size, file] of [
    [512, 'logo.png'],
    [180, 'apple-touch-icon.png'],
    [32, 'favicon-32.png'],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{width:100%;height:100%}</style>${svg}`
    );
    await page.screenshot({ path: `public/${file}`, omitBackground: true });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;background:#f7faf3;color:#202820;font-family:Arial,sans-serif;padding:88px}svg{width:96px;height:96px}h1{font-size:64px;margin:32px 0 20px;letter-spacing:0}p{font-size:28px;line-height:1.5;margin:0;max-width:850px}.domain{margin-top:42px;font-size:22px}</style>${svg}<h1>Screenshots to Video</h1><p>Turn product screenshots into demo and launch videos.</p><p class="domain">screenshotstovideo.com</p>`
  );
  await page.screenshot({ path: 'public/og-image.png' });
  const png = await fs.readFile('public/favicon-32.png');
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico[6] = 32;
  ico[7] = 32;
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14);
  ico.writeUInt32LE(22, 18);
  await fs.writeFile('public/favicon.ico', Buffer.concat([ico, png]));
} finally {
  await browser.close();
}
