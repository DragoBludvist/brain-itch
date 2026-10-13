import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content Security Policy: the browser refuses to run any script, or show any frame, that
// doesn't come from this site or from YouTube's official player. So even if a bug
// ever let someone inject markup into the page, it couldn't load or run their code.
// GitHub Pages can't send custom headers, so it ships as a <meta> tag. It's added to the
// production build only, because Vite's dev server needs inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ');

function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

// Relative base so the build works at any GitHub Pages path
// (https://<user>.github.io/<any-repo-name>/) without editing this file.
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
});
