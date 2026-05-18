import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'placehold.co' },
      { hostname: 'media.sketchfab.com' },
      { hostname: 'api.sketchfab.com' },
      { hostname: 'd1jns8a6aevev2.cloudfront.net' },
    ],
  },
}

export default nextConfig
