import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/ui/Explorer";
import { resolveLocale } from "@/i18n/locale";
import { EXPLORABLE_SYSTEMS, isExplorableSystem, SYSTEM_VIEW } from "@/lib/views";

export const dynamicParams = false;

export function generateStaticParams() {
  return EXPLORABLE_SYSTEMS.map((system) => ({ system }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/explore/[system]">): Promise<Metadata> {
  const { locale: rawLocale, system } = await params;
  const locale = resolveLocale(rawLocale);
  if (!isExplorableSystem(system)) notFound();
  const t = await getTranslations({ locale, namespace: "Systems" });
  const tMeta = await getTranslations({ locale, namespace: "Metadata" });
  const title = tMeta("systemTitle", { system: t(`${system}.name`) });
  const description = t(`${system}.description`);
  return { title, description, openGraph: { title, description } };
}

export default async function SystemPage({ params }: PageProps<"/[locale]/explore/[system]">) {
  const { locale: rawLocale, system } = await params;
  const locale = resolveLocale(rawLocale);
  if (!isExplorableSystem(system)) notFound();
  setRequestLocale(locale);

  return (
    <main id="main" className="flex flex-1 flex-col">
      <Explorer initialView={SYSTEM_VIEW[system]} />
    </main>
  );
}
