import "./globals.css";

/**
 * The real root layout (with <html> and <body>) lives in app/[locale]/layout.tsx.
 * This pass-through layout exists only so that app/page.tsx (the redirect to the
 * default locale) and app/not-found.tsx have a parent layout.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
