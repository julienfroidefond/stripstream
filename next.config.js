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
  {
    // Les navigateurs ignorent l'en-tête servi en HTTP clair (dev, LAN) : il
    // ne s'applique qu'une fois l'app servie en HTTPS derrière le proxy.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    // CSP volontairement prudente : seules des directives qui ne touchent ni
    // aux scripts ni aux styles de Next (pas de `script-src` strict sans nonce).
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
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
  // + modules natifs Prisma 7 (better-sqlite3) à ne pas bundler
  serverExternalPackages: [
    "dns",
    "pino",
    "pino-pretty",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  // Requis par Next 16 : un contenu vide évite l'erreur « Turbopack build with
  // a webpack config and no turbopack config » (cf. `webpack` ci-dessous).
  turbopack: {},
  // Optimisation du cache en dev
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
