import { envConfigs } from '@/config';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

export function publicPageLinks(
  path: string,
  locale: ReturnType<typeof getLocale>
) {
  const urlFor = (language: (typeof locales)[number]) =>
    localizeUrl(new URL(path, envConfigs.app_url), { locale: language }).href;
  return [
    { rel: 'canonical', href: urlFor(locale) },
    ...locales.map((language) => ({
      rel: 'alternate',
      hrefLang: language,
      href: urlFor(language),
    })),
    { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
  ];
}
