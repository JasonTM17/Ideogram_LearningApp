import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@ideogram/api-client', '@ideogram/contracts', '@ideogram/design-tokens'],
};

export default nextConfig;
