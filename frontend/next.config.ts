import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const backendUrl = process.env.BACKEND_URL;

function getHostname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHostname = getHostname(supabaseUrl);
const backendHostname = getHostname(backendUrl);

const remotePatterns = [
  // Allow any Supabase Storage subdomain (e.g., vqzuvjubeohfsixguzpa.supabase.co)
  { protocol: "https" as const, hostname: "*.supabase.co" },
  // Also include the explicit hostname from env if present
  ...(supabaseHostname ? [{ protocol: "https" as const, hostname: supabaseHostname }] : []),
  ...(backendHostname
    ? [
        { protocol: "https" as const, hostname: backendHostname },
      ]
    : []),
];

// Multi-megabyte 3D assets under /public are served with `max-age=0` by default,
// so every visit re-downloads them. Content is stable per deploy path; rename a
// file when it changes to bust this.
const immutableAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      { source: "/models/:path*", headers: immutableAssetHeaders },
      { source: "/hdri/:path*", headers: immutableAssetHeaders },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
