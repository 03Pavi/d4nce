/** @type {import('next').NextConfig} */
module.exports = {
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
