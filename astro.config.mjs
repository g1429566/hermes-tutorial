import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Hermes Agent 学习教程',
      defaultLocale: 'zh',
      locales: { zh: { label: '简体中文', lang: 'zh-CN' } },
      components: {
        Header: './src/components/overrides/Header.astro',
      },
      sidebar: [
        { label: '认识 Hermes', items: [{ autogenerate: { directory: 'm0-overview' } }] },
        { label: '组件演示', items: [{ autogenerate: { directory: 'demo' } }] },
      ],
    }),
    mdx(),
    react(),
  ],
});
