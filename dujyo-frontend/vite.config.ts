import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      nodePolyfills({
        // Enable polyfills for specific globals and modules
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      // Bundle analyzer can be added with: npm install --save-dev rollup-plugin-visualizer
      // Uncomment when needed:
      // isProduction && visualizer({
      //   open: false,
      //   filename: './dist/stats.html',
      //   gzipSize: true,
      //   brotliSize: true,
      // }),
    ].filter(Boolean),
    resolve: {
      alias: {
        buffer: 'buffer',
        stream: 'stream-browserify',
        util: 'util',
        events: 'events',
      },
    },
    define: {
      global: 'globalThis',
      'process.env': {},
    },
    optimizeDeps: {
      include: [
        'buffer',
        'stream-browserify',
        'util',
        'events',
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'lucide-react',
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    build: {
      // Production optimizations
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console.log in production
          drop_debugger: isProduction,
        },
      },
      // Code splitting and chunk optimization
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            // Feature chunks
            'player': [
              './src/components/Player/Player.tsx',
              './src/components/Player/GlobalPlayer.tsx',
            ],
            'artist': [
              './src/components/artist/ArtistDashboard.tsx',
              './src/components/artist/ArtistAnalytics.tsx',
            ],
            'dex': [
              './src/components/DEX/DEXSwap.tsx',
              './src/components/DEX/DEXDashboard.tsx',
            ],
          },
          // Optimize chunk file names
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `fonts/[name]-[hash][extname]`;
            }
            if (/mp3|wav|ogg|m4a/i.test(ext)) {
              return `audio/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Source maps for production debugging (optional)
      sourcemap: !isProduction,
      // CSS code splitting
      cssCodeSplit: true,
      // Optimize assets
      assetsInlineLimit: 4096, // Inline small assets (< 4KB)
    },
    server: {
      host: '0.0.0.0', // Permitir acceso desde cualquier host
      allowedHosts: [
        'localhost',
        '.ngrok.io',
        '.ngrok-free.app',
        '.ngrok-free.dev',
        'gustily-nonsuppressed-emilio.ngrok-free.dev',
      ],
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
        },
        '/register': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
        },
        '/login': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
        },
        '/forgot-password': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: process.env.VITE_WS_URL || 'ws://localhost:8083',
          ws: true,
          changeOrigin: true,
        },
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    // CDN configuration for production (set via environment variable)
    base: isProduction ? (process.env.VITE_CDN_URL || '/') : '/',
    // Ensure audio files are included in build
    assetsInclude: ['**/*.wav', '**/*.mp3', '**/*.ogg'],
  };
});
