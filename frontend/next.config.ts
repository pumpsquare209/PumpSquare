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

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
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
