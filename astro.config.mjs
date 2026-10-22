// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://johan-field-notes.johansj.workers.dev',
  session: false,
  adapter: cloudflare()
});
