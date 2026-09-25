import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameHub } from "@/components/games/GameHub";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/games">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("title"), description: t("description") };
}

export default async function GamesPage({ params }: PageProps<"/[locale]/games">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Games" });

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-center text-4xl font-bold">🎮 {t("heading")}</h1>
      <GameHub />
    </main>
  );
}
