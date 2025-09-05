import { languages, defaultLang } from './config';

export type Lang = keyof typeof languages;

// Generate routes for each language
export function generateLanguageRoutes() {
  const routes: Record<Lang, string[]> = {
    fr: ['', '/about', '/blog', '/contact', '/faq', '/privacy', '/terms', '/sitemap'],
    en: ['/en', '/en/about', '/en/blog', '/en/contact', '/en/faq', '/en/privacy', '/en/terms', '/en/sitemap'],
    de: ['/de', '/de/about', '/de/blog', '/de/contact', '/de/faq', '/de/privacy', '/de/terms', '/de/sitemap'],
    it: ['/it', '/it/about', '/it/blog', '/it/contact', '/it/faq', '/it/privacy', '/it/terms', '/it/sitemap'],
    pt: ['/pt', '/pt/about', '/pt/blog', '/pt/contact', '/pt/faq', '/pt/privacy', '/pt/terms', '/pt/sitemap'],
    es: ['/es', '/es/about', '/es/blog', '/es/contact', '/es/faq', '/es/privacy', '/es/terms', '/es/sitemap'],
    nl: ['/nl', '/nl/about', '/nl/blog', '/nl/contact', '/nl/faq', '/nl/privacy', '/nl/terms', '/nl/sitemap']
  };
  
  return routes;
}

// Get current language from URL
export function getCurrentLang(pathname: string): Lang {
  const lang = pathname.split('/')[1] as Lang;
  return languages[lang] ? lang : defaultLang;
}

// Get path without language prefix
export function getPathWithoutLang(pathname: string): string {
  const lang = getCurrentLang(pathname);
  if (lang === defaultLang) return pathname;
  return pathname.replace(`/${lang}`, '') || '/';
}

// Generate language-specific URL
export function getLanguageUrl(pathname: string, targetLang: Lang): string {
  const pathWithoutLang = getPathWithoutLang(pathname);
  
  if (targetLang === defaultLang) {
    return pathWithoutLang;
  }
  
  return `/${targetLang}${pathWithoutLang}`;
}

// Get alternate language URLs for hreflang
export function getAlternateUrls(pathname: string): Record<Lang, string> {
  const alternates: Record<Lang, string> = {} as Record<Lang, string>;
  
  Object.keys(languages).forEach((lang) => {
    alternates[lang as Lang] = getLanguageUrl(pathname, lang as Lang);
  });
  
  return alternates;
}
