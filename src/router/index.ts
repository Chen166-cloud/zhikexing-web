import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/courses',
    name: 'Courses',
    component: () => import('../views/CoursesView.vue'),
  },
  {
    path: '/courses/:id',
    name: 'CourseDetail',
    component: () => import('../views/CourseDetailView.vue'),
  },
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
  // 历史书签继续进入现有工作台，不再加载已停用的经典应用。
  { path: '/ai-chat', redirect: '/agent' },
  { path: '/comfort-simulator', redirect: '/agent' },
  { path: '/customer-service', redirect: '/agent' },
  { path: '/chat-pdf', redirect: '/agent' },
  { path: '/game', redirect: '/agent' },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem('zhikexing_token'))
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
