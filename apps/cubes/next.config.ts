import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(basePath && { basePath }),
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;
