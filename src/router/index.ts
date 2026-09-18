import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/agent',
    name: 'AgentWorkspace',
    component: () => import('../views/AgentWorkspace.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/ai-chat',
    name: 'AIChat',
    component: () => import('../views/AIChat.vue'),
  },
  {
    path: '/comfort-simulator',
    name: 'ComfortSimulator',
    component: () => import('../views/ComfortSimulator.vue'),
  },
  {
    path: '/customer-service',
    name: 'CustomerService',
    component: () => import('../views/CustomerService.vue'),
  },
  {
    path: '/chat-pdf',
    name: 'ChatPDF',
    component: () => import('../views/ChatPDF.vue'),
  },
  {
    path: '/game',
    name: 'Game',
    component: () => import('../views/GameChat.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from) => {
  if (from.path === '/chat-pdf') {
    window.dispatchEvent(new CustomEvent('cleanupChatPDF'))
  }

  const hasToken = Boolean(localStorage.getItem('iiip_token'))
  if (!to.meta.public && !hasToken) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.public && hasToken) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/'
    return redirect === '/login' || redirect === '/register' ? '/' : redirect
  }
})

export default router
