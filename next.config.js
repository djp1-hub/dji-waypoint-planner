/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable PWA in development to avoid caching issues
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  // turbopack: {} aktivuje Turbopack (Next.js 15+).
  // next-pwa přidá webpack config která má přednost.
  turbopack: {},
  // No transpilePackages needed — Cesium is loaded via CDN script tag
  allowedDevOrigins: ['192.168.0.12'],
};

module.exports = withPWA(nextConfig);
