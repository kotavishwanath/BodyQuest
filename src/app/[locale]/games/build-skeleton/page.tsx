import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BuildSkeletonScreen } from "@/components/games/Screens";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/games/build-skeleton">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("skeleton.name"), description: t("skeleton.blurb") };
}

export default async function BuildSkeletonPage({ params }: PageProps<"/[locale]/games/build-skeleton">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Skeleton" });
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-center text-3xl font-bold">🦴 {t("title")}</h1>
      <BuildSkeletonScreen />
    </main>
  );
}
