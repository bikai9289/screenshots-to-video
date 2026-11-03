import fs from 'node:fs';
const paths=['','/pricing','/contact','/privacy-policy','/terms-of-service'];
const sitemap=`import { createFileRoute } from '@tanstack/react-router';
import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';
const paths=${JSON.stringify(paths)};
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export const Route=createFileRoute('/sitemap.xml')({server:{handlers:{GET:()=>{
  const entries=paths.flatMap(path=>locales.map(locale=>{
    const href=localizeUrl(new URL(path||'/',envConfigs.app_url),{locale}).href;
    return '<url><loc>'+escape(href)+'</loc>'+locales.map(language=>'<xhtml:link rel="alternate" hreflang="'+language+'" href="'+escape(localizeUrl(new URL(path||'/',envConfigs.app_url),{locale:language}).href)+'"/>').join('')+'</url>';
  }));
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+entries.join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}}}});
`;
fs.writeFileSync('src/routes/sitemap[.]xml.ts',sitemap);
for(const route of ['llms.txt','llms-full.txt']){
  fs.writeFileSync(`src/routes/${route.replace('.', '[.]')}.ts`,`import {createFileRoute} from '@tanstack/react-router';
import {envConfigs} from '@/config';
export const Route=createFileRoute('/${route}')({server:{handlers:{GET:()=>new Response([
  '# Screenshots to Video','',
  '> A paid tool for making product demo and launch videos from screenshots.','',
  '## Public pages','',
  '- [Home]('+envConfigs.app_url+'/): Purpose, illustrative motion previews, workflow and FAQ.',
  '- [Pricing]('+envConfigs.app_url+'/pricing): One-time USD packs; no free generation.',
  '- [Contact]('+envConfigs.app_url+'/contact): Account-based support.',
  '- [Privacy]('+envConfigs.app_url+'/privacy-policy): Inputs, provider processing and retention.',
  '- [Terms]('+envConfigs.app_url+'/terms-of-service): Purchase, usage and refund conditions.','',
  '## Important distinctions','',
  'Homepage motion previews use a fictional product and are not customer work.',
  'Video creation requires authentication and a paid render pack.',
  'AI-generated video may alter interface text and details; review before publishing.',
  'Generation depends on the configured SeeAPI service. Do not infer availability from these documentation links.',
  'Private Studio tasks, screenshots and account pages are not public content.',''
].join('\\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}})}}});
`);
}
