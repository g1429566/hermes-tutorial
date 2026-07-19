import type { NextConfig } from 'next';

// 纯客户端单页应用：静态导出到 out/，由 nginx / scripts/serve.mjs 直接托管。
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
