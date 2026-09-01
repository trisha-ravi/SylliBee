import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites at https://<user>.github.io/<repo>/
const ghPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: ghPages ? '/SylliBee/' : '/',
  plugins: [react()],
});
