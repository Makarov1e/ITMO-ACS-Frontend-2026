import { defineConfig } from 'vite';

export default defineConfig({
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
