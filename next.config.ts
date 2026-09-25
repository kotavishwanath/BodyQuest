import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at src/i18n/request.ts (the default location).
const withNextIntl = createNextIntlPlugin();

/**
 * Set STATIC_EXPORT=true (see `npm run build:export`) to produce a fully static
 * site in /out that schools can host on any static web server.
 * Static export does not support custom headers or the image optimiser, so
 * those settings are only applied in the regular (server) build.
 */
const isStaticExport = process.env.STATIC_EXPORT === "true";

const ONE_YEAR_IMMUTABLE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            // 3D models (GLB / Draco / KTX2) are versioned by filename,
            // so they can be cached for a long time.
            {
              source: "/models/:path*",
              headers: [{ key: "Cache-Control", value: ONE_YEAR_IMMUTABLE }],
            },
            {
              source: "/sounds/:path*",
              headers: [{ key: "Cache-Control", value: ONE_YEAR_IMMUTABLE }],
            },
            {
              source: "/diagrams/:path*",
              headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
            },
          ];
        },
      }),
};

export default withNextIntl(nextConfig);
