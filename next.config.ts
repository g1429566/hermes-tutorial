import type { NextConfig } from 'next';

// 纯客户端单页应用：静态导出到 out/，由 nginx / scripts/serve.mjs 直接托管。
// NEXT_BASE_PATH 仅 GitHub Pages 构建时设置（站点挂在 /<repo>/ 子路径下）；
// 同时内联为 NEXT_PUBLIC_BASE_PATH，供客户端拼接 /pyodide/ 等绝对资源路径。
const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_BASE_PATH || '',
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH || '',
  },
};

export default nextConfig;
