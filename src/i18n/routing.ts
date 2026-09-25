import { defineRouting } from "next-intl/routing";

/**
 * Locale routing. Phase 1 ships English only; Hindi ("hi") and Telugu ("te")
 * are added in Phase 9 by extending `locales` and adding messages/{locale}.json.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  // Every URL carries its locale (/en/explore). This keeps static export simple
  // because no proxy/middleware is needed to resolve the locale.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
