import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgePicker } from "@/components/ui/AgePicker";
import { FactOfTheDay } from "@/components/ui/FactOfTheDay";
import { Mascot } from "@/components/ui/Mascot";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { siteConfig } from "@/config/site";
import { resolveLocale } from "@/i18n/locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Home" });

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-10 px-4 py-10">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {siteConfig.name}
          <span className="block text-2xl font-semibold text-primary sm:text-3xl">{t("tagline")}</span>
        </h1>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Mascot className="size-32 shrink-0 sm:size-40" />
          <div className="relative max-w-md rounded-3xl border-2 bg-card p-5 text-left text-lg shadow-sm">
            <p className="font-bold">{t("mascotName")}</p>
            <p>{t("mascotHello")}</p>
            <SpeakButton text={t("mascotHello")} rate={0.95} className="mt-3" />
          </div>
        </div>
      </section>

      <FactOfTheDay />

      <AgePicker />
    </main>
  );
}
