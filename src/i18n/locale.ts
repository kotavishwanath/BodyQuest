import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "./routing";

/** Narrows a route param to a supported locale, or renders the 404 page. */
export function resolveLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}

/** Static params for every locale (used by `generateStaticParams`). */
export function localeParams(): { locale: Locale }[] {
  return routing.locales.map((locale) => ({ locale }));
}
