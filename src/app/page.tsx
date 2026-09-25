import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * "/" → "/en". Locale middleware/proxy does not run in static export mode, so
 * the root route redirects to the default locale itself.
 */
export default function RootPage() {
  const target = `/${routing.defaultLocale}/`;

  // Static hosts can't send HTTP redirects, so emit an HTML refresh as well
  // (works even before/without JavaScript).
  if (process.env.STATIC_EXPORT === "true") {
    return (
      <html lang={routing.defaultLocale}>
        <head>
          <meta httpEquiv="refresh" content={`0; url=${target}`} />
        </head>
        <body>
          <a href={target}>Continue to BodyVerse</a>
        </body>
      </html>
    );
  }

  redirect(`/${routing.defaultLocale}`);
}
