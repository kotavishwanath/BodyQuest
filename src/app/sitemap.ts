import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { ALL_PARTS } from "@/lib/parts";
import { EXPLORABLE_SYSTEMS } from "@/lib/views";

export const dynamic = "force-static";

/** Routes included in the sitemap (extended as later phases add pages). */
const ROUTES = [
  "",
  "/explore",
  "/games",
  "/games/find-it",
  "/games/build-skeleton",
  "/games/quiz",
  "/stickers",
  ...EXPLORABLE_SYSTEMS.map((system) => `/explore/${system}`),
  ...ALL_PARTS.map((part) => `/explore/part/${part.id}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    ROUTES.map((route) => ({
      url: `${siteConfig.url}/${locale}${route}`,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : route.split("/").length > 3 ? 0.6 : 0.8,
    })),
  );
}
