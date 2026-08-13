/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@precedent/core',
    '@precedent/search',
    '@precedent/ui-tokens',
    '@precedent/api',
  ],
};

module.exports = nextConfig;
