import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 首次路由解析完成后挂载，避免直接打开注册页时被认证刷新误跳到登录页。
router.isReady().then(() => app.mount('#app'))
