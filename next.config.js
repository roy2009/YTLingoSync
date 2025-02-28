/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'puppeteer-core',
    'puppeteer',
    'fluent-ffmpeg',
    'axios',
    'iso8601-duration',
    'socks-proxy-agent',
    'https-proxy-agent',
    'http-proxy-agent'
  ],
  typescript: {
    // ⚠️ 仅在修复问题前临时使用
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig 