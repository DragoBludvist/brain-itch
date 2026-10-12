import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works at any GitHub Pages path
// (https://<user>.github.io/<any-repo-name>/) without editing this file.
export default defineConfig({
  base: './',
  plugins: [react()],
});
