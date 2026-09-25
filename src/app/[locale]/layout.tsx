import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Lexend } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { siteConfig } from "@/config/site";
import { localeParams, resolveLocale } from "@/i18n/locale";

// Playful rounded font for kids' modes.
const kidsFont = Fredoka({
  subsets: ["latin"],
  variable: "--font-kids",
  display: "swap",
});

// Clean, highly legible font for the BiPC study theme (loaded on demand).
const studyFont = Inter({
  subsets: ["latin"],
  variable: "--font-study",
  display: "swap",
  preload: false,
});

// Reading-friendly option (dyslexia-friendly setting, enabled in Phase 5).
const readableFont = Lexend({
  subsets: ["latin"],
  variable: "--font-readable",
  display: "swap",
  preload: false,
});

// Pre-render every locale at build time; unknown locales 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("title", { name: siteConfig.name });

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description: t("description"),
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description: t("description"),
      locale,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d4aff",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  // Enables static rendering for next-intl in this layout and its pages.
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Common" });

  return (
    <html
      lang={locale}
      data-theme="kids"
      className={`${kidsFont.variable} ${studyFont.variable} ${readableFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers>
            <SiteHeader />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
