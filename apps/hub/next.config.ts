import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  async redirects() {
    if (!process.env.NEXT_PUBLIC_BASE_PATH) return []
    return [
      {
        source: '/',
        destination: process.env.NEXT_PUBLIC_BASE_PATH,
        permanent: false,
        basePath: false as any,
      },
    ]
  },
}

export default nextConfig
