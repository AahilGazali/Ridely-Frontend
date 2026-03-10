/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Google Maps loads from external script
  transpilePackages: [],
};

module.exports = nextConfig;
