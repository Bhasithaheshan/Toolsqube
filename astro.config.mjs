import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domain: toolsqube.com
export default defineConfig({
  site: 'https://toolsqube.com',
  integrations: [sitemap()],
});
