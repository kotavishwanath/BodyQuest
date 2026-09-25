import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Explorer } from "@/components/ui/Explorer";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/explore">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("exploreTitle"),
    description: t("exploreDescription"),
    openGraph: { title: t("exploreTitle"), description: t("exploreDescription") },
  };
}

export default async function ExplorePage({ params }: PageProps<"/[locale]/explore">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <main id="main" className="flex flex-1 flex-col">
      <Explorer />
    </main>
  );
}
