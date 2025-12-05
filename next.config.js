const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false, // Enable PWA in development for testing
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\/socket.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/socket\.io\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
    // Import OneSignal SDK in the service worker
    importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  images: {
    domains: ['localhost', '127.0.0.1', 'commondatastorage.googleapis.com','jpltcratljaypnbdywac.supabase.co'],
  },
};

module.exports = withPWA(nextConfig);