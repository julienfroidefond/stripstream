/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Keep dynamic page segments in the client router cache for the same
    // duration as the home provider data. Revisiting the home page during a
    // session can then reuse its RSC payload instead of replaying every row.
    staleTimes: {
      dynamic: 120,
    },
  },
  logging: {
    browserToTerminal: true,
  },
  output: "standalone",
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Les vignettes sont servies via le proxy interne /api/komga|stripstream/images (même origine),
    // donc pas de remotePatterns nécessaire pour next/image sur ces URLs.
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Configuration pour améliorer la résolution DNS
  serverExternalPackages: ["dns", "pino", "pino-pretty"],
  // Optimisations pour Docker dev
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  // Optimisation du cache en dev
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
