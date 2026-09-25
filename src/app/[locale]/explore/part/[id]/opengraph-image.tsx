import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { localeParams } from "@/i18n/locale";
import { ALL_PARTS, getPart, getSummary } from "@/lib/parts";

export const alt = "Body part explained in 3D";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Pre-render one card per locale and part at build time (works with static export). */
export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => ALL_PARTS.map((part) => ({ locale, id: part.id })));
}

/** Open Graph card for each body part, generated at build time. */
export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const part = getPart(id);
  const title = part?.names.common ?? siteConfig.name;
  const subtitle = part?.names.scientific ?? "";
  const summary = part ? getSummary(part) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #eef0ff 0%, #d9ccff 100%)",
          color: "#1f2340",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#5b3fd6" }}>{siteConfig.name}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 44, marginTop: 12, color: "#4b4f75" }}>{subtitle}</div>}
          <div style={{ fontSize: 32, marginTop: 28, maxWidth: 1000, lineHeight: 1.35 }}>{summary}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#4b4f75" }}>Explore it in 3D</div>
      </div>
    ),
    size,
  );
}
