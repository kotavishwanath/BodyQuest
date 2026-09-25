import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StickerBook } from "@/components/games/StickerBook";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/stickers">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Stickers" });
  return { title: t("title"), description: t("description") };
}

export default async function StickersPage({ params }: PageProps<"/[locale]/stickers">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Stickers" });
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-center text-4xl font-bold">⭐ {t("title")}</h1>
      <p className="mb-6 mt-2 text-center text-lg text-muted-foreground">{t("description")}</p>
      <StickerBook />
    </main>
  );
}
