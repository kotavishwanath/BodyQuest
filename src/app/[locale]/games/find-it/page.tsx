import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Explorer } from "@/components/ui/Explorer";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/games/find-it">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("findIt.name"), description: t("findIt.blurb") };
}

export default async function FindItPage({ params }: PageProps<"/[locale]/games/find-it">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <main id="main" className="flex flex-1 flex-col">
      <Explorer game="find-it" />
    </main>
  );
}
