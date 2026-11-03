const { chromium } = require('C:/Users/Administrator/AppData/Local/Temp/stv-ui-tools/node_modules/playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page = await browser.newPage();
  const base = 'http://127.0.0.1:4311/screenshots-to-video/';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  const original = await page.evaluate(() => ({h1:document.querySelector('h1').innerHTML,structure:[...document.querySelectorAll('main *')].map(el=>`${el.tagName}.${el.className}`).join('|'),headings:[...document.querySelectorAll('h2,h3')].map(el=>el.innerHTML)}));
  const reports = [];
  for(const width of [1440,768,390,360]) {
    await page.setViewportSize({width,height:950});
    await page.goto(`${base}copy-v2.html`);
    await page.waitForFunction(()=>document.querySelector('.brandmark svg'));
    const result = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,smallText:[...document.querySelectorAll('body *')].filter(el=>!el.children.length && el.textContent.trim() && el.getBoundingClientRect().width>0 && parseFloat(getComputedStyle(el).fontSize)<14).length,h1:document.querySelector('h1').innerHTML,structure:[...document.querySelectorAll('main *')].map(el=>`${el.tagName}.${el.className}`).join('|'),headings:[...document.querySelectorAll('h2,h3')].map(el=>el.innerHTML)}));
    if(result.scrollWidth>width || result.smallText || result.h1!==original.h1 || result.structure!==original.structure || JSON.stringify(result.headings)!==JSON.stringify(original.headings)) throw new Error(`Copy layout changed at ${width}`);
    reports.push({width,overflow:false,minText:'14px',structure:'same',headings:'same'});
    if(width===1440 || width===390) await page.screenshot({path:path.join(__dirname,`copy-v2-${width}.png`),fullPage:width===390});
  }
  await page.getByText('Do I need a paid plan?',{exact:true}).click();
  if(!await page.locator('details').nth(1).evaluate(el=>el.open)) throw new Error('Paid FAQ failed');
  console.log(JSON.stringify({reports,errors,paidFaq:'passed'},null,2));
  await browser.close();
  if(errors.length) process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1)});
