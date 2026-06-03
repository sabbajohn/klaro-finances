import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import { bootstrapSession, isAuthenticated, sessionState } from './state/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/app',
      name: 'app',
      component: HomeView,
    },
  ],
})

router.beforeEach(async (to) => {
  if (sessionState.booting) {
    await bootstrapSession()
  }

  if (to.path === '/login' && isAuthenticated.value) {
    return '/app'
  }

  if (to.path.startsWith('/app') && !isAuthenticated.value) {
    return '/login'
  }

  return true
})

export default router
