import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Le site se déploie tout seul et l'application s'installe à la main : le
// commit est ce qui répond à « quelle version ai-je devant moi ». Une
// construction hors dépôt s'annonce comme telle au lieu de faire échouer le build.
const commit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'hors dépôt'; }
})();

export default defineConfig({
  // Le site vit dans un sous-dossier de GitHub Pages.
  base: '/Bricks_List/',
  define: { __COMMIT__: JSON.stringify(commit) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        // Identité explicite : sans `id`, le navigateur la déduit de `start_url`,
        // et le jour où celui-ci change l'app installée devient un fantôme que
        // plus rien ne met à jour.
        id: '/Bricks_List/',
        name: 'Bricks List',
        short_name: 'Bricks List',
        description: 'Collection de sets LEGO : catalogue, wishlist et statistiques.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        // Ces couleurs habillent l'app avant son exécution (écran de démarrage,
        // barre système) : elles doivent suivre le fond réel du thème sombre.
        background_color: '#0f1014',
        theme_color: '#0f1014',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Coquille mise en cache pour un démarrage hors ligne. L'API Rebrickable
        // n'est jamais mise en cache : elle doit rester fraîche et échouer
        // proprement sans réseau. Seules les images de sets le sont.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/Bricks_List/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /cdn\.rebrickable\.com$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-sets',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
