import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/ui/Explorer";
import { resolveLocale } from "@/i18n/locale";
import { ALL_PARTS, getPart, getSummary } from "@/lib/parts";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_PARTS.map((part) => ({ id: part.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/explore/part/[id]">): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  const part = getPart(id);
  if (!part) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const name = part.names.scientific ? `${part.names.common} (${part.names.scientific})` : part.names.common;
  const title = t("partTitle", { name });
  const description = getSummary(part);
  return { title, description, openGraph: { title, description } };
}

export default async function PartPage({ params }: PageProps<"/[locale]/explore/part/[id]">) {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  if (!getPart(id)) notFound();
  setRequestLocale(locale);

  return (
    <main id="main" className="flex flex-1 flex-col">
      <Explorer initialPartId={id} />
    </main>
  );
}
