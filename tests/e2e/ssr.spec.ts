import { expect, test } from '@playwright/test';

test('homepage can be read without JavaScript and has unique metadata',async ({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  const base=process.env.STV_BASE_URL || 'http://127.0.0.1:3000';
  for(const locale of ['', '/zh']) {
    await page.goto(base+locale);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('details')).toHaveCount(11);
    await expect(page.locator('html')).toHaveAttribute('lang',locale ? 'zh' : 'en');
  }
  await context.close();
});

test('homepage hydrates without React mismatches',async ({page})=>{
  const errors:string[]=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.play-control')).toBeEnabled();
  await page.getByRole('tab',{name:'Feature update'}).click();
  await expect(page.getByRole('tabpanel')).toContainText('One feature.');
  expect(errors).toEqual([]);
});
