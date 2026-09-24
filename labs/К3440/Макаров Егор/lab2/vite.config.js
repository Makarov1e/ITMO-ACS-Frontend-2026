import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5172,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        search: 'index.html',
        login: 'login.html',
        register: 'register.html',
        profile: 'profile.html',
        restaurant: 'restaurant.html',
        bookings: 'bookings.html'
      }
    }
  }
});
