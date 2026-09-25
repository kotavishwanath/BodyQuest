import Link from "next/link";
import { routing } from "@/i18n/routing";

/** 404 for URLs outside any locale (e.g. /xyz). Rendered without [locale] layout. */
export default function RootNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center font-sans">
        <p className="text-6xl" aria-hidden="true">🔍</p>
        <h1 className="text-2xl font-bold">We couldn&apos;t find that page</h1>
        <Link
          href={`/${routing.defaultLocale}`}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Go home
        </Link>
      </body>
    </html>
  );
}
