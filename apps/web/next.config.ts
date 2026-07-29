import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ideogram/api-client', '@ideogram/contracts', '@ideogram/design-tokens'],
};

export default nextConfig;
