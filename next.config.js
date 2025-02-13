/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config...
  experimental: {
    appDir: true,
  },
  // Add cookie domain configuration
  serverRuntimeConfig: {
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
  }
}

module.exports = nextConfig;
