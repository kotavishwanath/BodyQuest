import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AtlasExplorer } from "@/components/atlas/AtlasExplorer";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/atlas">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Atlas" });
  return { title: t("title"), description: t("description") };
}

export default async function AtlasPage({ params }: PageProps<"/[locale]/atlas">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <main id="main" className="flex flex-1 flex-col">
      <AtlasExplorer />
    </main>
  );
}
