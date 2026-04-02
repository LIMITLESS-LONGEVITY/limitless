import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
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
