import { createRouter, createWebHistory } from 'vue-router';
import { loadStoredSession } from '../composables/useApi';
import SearchView from '../views/SearchView.vue';
import RestaurantView from '../views/RestaurantView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import BookingsView from '../views/BookingsView.vue';
import NotFoundView from '../views/NotFoundView.vue';
const router = createRouter({ history: createWebHistory(), scrollBehavior: () => ({ top: 0 }), routes: [
  { path: '/', name: 'search', component: SearchView }, { path: '/restaurants/:id', name: 'restaurant', component: RestaurantView, props: true },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } }, { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } }, { path: '/bookings', name: 'bookings', component: BookingsView, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
]});
router.beforeEach((to) => { const hasSession = Boolean(loadStoredSession()?.token); if (to.meta.requiresAuth && !hasSession) return { name: 'login', query: { next: to.fullPath } }; if (to.meta.guestOnly && hasSession) return { name: 'profile' }; return true; });
export default router;
