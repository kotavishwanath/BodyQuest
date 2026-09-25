/**
 * Site-wide configuration. The product name is a placeholder and can be
 * changed with NEXT_PUBLIC_SITE_NAME without touching any component.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "BodyVerse",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
} as const;
