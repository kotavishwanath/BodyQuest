"use client";

import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { useStoreHydrated } from "@/hooks/use-client-env";
import { Link, usePathname } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explore", key: "explore", icon: "🧭" },
  { href: "/atlas", key: "atlas", icon: "🧬" },
  { href: "/games", key: "games", icon: "🎮" },
  { href: "/stickers", key: "stickers", icon: "⭐" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Common");
  const tModes = useTranslations("AgeModes");
  const tNav = useTranslations("Nav");
  const pathname = usePathname();
  const hydrated = useStoreHydrated();
  const ageMode = useAppStore((state) => state.ageMode);
  const theme = useAppStore((state) => state.theme);
  const soundOn = useAppStore((state) => state.soundOn);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const toggleSound = useAppStore((state) => state.toggleSound);

  const mode = hydrated ? ageMode : null;
  // Games and stickers are for the kids' modes; the Atlas is for Junior and BiPC.
  const nav = NAV.filter((n) => {
    if (n.key === "atlas") return mode === "junior" || mode === "bipc";
    if (n.key === "games" || n.key === "stickers") return mode !== "bipc";
    return true;
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
        <Link href="/" className="flex min-h-[var(--tap)] items-center gap-2 rounded-full px-2 text-xl font-bold tracking-tight">
          <span aria-hidden="true">🫀</span>
          <span>{siteConfig.name}</span>
        </Link>

        {mode && (
          <nav aria-label={tNav("label")} className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full px-3 font-semibold hover:bg-muted",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {tNav(item.key)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {mode && (
            <>
              <span className="hidden rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground lg:inline-flex">
                {t("modeBadge", { mode: `${AGE_MODE_CONFIG[mode].emoji} ${tModes(`${mode}.label`)}` })}
              </span>
              <Link href="/" className="inline-flex min-h-[var(--tap)] items-center rounded-full border px-4 text-sm font-semibold hover:bg-muted">
                {t("changeAge")}
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!soundOn}
            aria-label={soundOn ? t("soundOn") : t("soundOff")}
            className="inline-flex size-[var(--tap)] items-center justify-center rounded-full border hover:bg-muted"
          >
            {soundOn ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
          </button>
          {mode === "bipc" && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
              className="inline-flex size-[var(--tap)] items-center justify-center rounded-full border hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
