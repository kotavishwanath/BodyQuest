import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KidsQuizScreen } from "@/components/games/Screens";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/games/quiz">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("quiz.name"), description: t("quiz.blurb") };
}

export default async function QuizPage({ params }: PageProps<"/[locale]/games/quiz">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Quiz" });
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-center text-3xl font-bold">🏆 {t("title")}</h1>
      <KidsQuizScreen />
    </main>
  );
}
