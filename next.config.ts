import type { NextConfig } from 'next';
import manifest from './package.json';

const nextConfig: NextConfig = {
  output: 'export',
  // Compile release metadata into the static site. No runtime backend is needed.
  env: {
    NEXT_PUBLIC_SHIPIT_VERSION: manifest.version,
    NEXT_PUBLIC_SHIPIT_SHA: (process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0,7),
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/chatgpt-agent-test',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
