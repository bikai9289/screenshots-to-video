import fs from 'node:fs';
const policies=JSON.parse(fs.readFileSync('scripts/product-policies.json','utf8'));
for(const [slug,locales] of Object.entries(policies))for(const [locale,page] of Object.entries(locales)){
  const meta={title:page.title,description:page.description,updated_at:'2026-11-03'};
  fs.writeFileSync(`src/content/pages/${slug}.${locale}.mdx`,`export const meta = ${JSON.stringify(meta,null,2)};\n\n${page.sections.map(([title,text],index)=>`## ${index+1}. ${title}\n\n${text}`).join('\n\n')}\n`);
}
console.log('Synced product policies in English and Chinese.');
