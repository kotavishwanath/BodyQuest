import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("NotFound");
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl" aria-hidden="true">🔍</p>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-lg text-muted-foreground">{t("body")}</p>
      <Link
        href="/"
        className="inline-flex min-h-[var(--tap)] items-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground hover:brightness-110"
      >
        {t("goHome")}
      </Link>
    </main>
  );
}
