import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '@': './src',
      '@components': './src/components',
      '@assets': './src/assets',
      '@utils': './src/utils',
      '@types': './src/types',
      '@styles': './src/styles',
    },
  },
  optimizeDeps: {
    include: ['parse5']
  }
})
