/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Configuration pour améliorer la résolution DNS
  serverExternalPackages: ['dns'],
};

module.exports = nextConfig;
