<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useDark, useToggle } from '@vueuse/core'
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { authAPI, authStorage } from './services/api'

const isDark = useDark()
const toggleDark = useToggle(isDark)
const route = useRoute()
const router = useRouter()
const user = ref(null)
const isAuthed = ref(Boolean(authStorage.getToken()))
const isNicknameDialogOpen = ref(false)
const nicknameInput = ref(null)
const nicknameForm = ref('')
const nicknameError = ref('')
const nicknameSaving = ref(false)

const isAuthPage = computed(() => route.path === '/login' || route.path === '/register')
const showBack = computed(() => isAuthed.value && route.path !== '/' && !isAuthPage.value)
const showUserArea = computed(() => isAuthed.value && !isAuthPage.value)
const displayName = computed(() => {
  const name = user.value?.nickName || user.value?.userName
  return name && !/^\d{12,}$/.test(String(name)) ? name : '我的账户'
})

const refreshAuthState = async () => {
  isAuthed.value = Boolean(authStorage.getToken())
  if (!isAuthed.value) {
    user.value = null
    if (!isAuthPage.value) {
      router.replace({
        path: '/login',
        query: route.fullPath === '/' ? {} : { redirect: route.fullPath },
      })
    }
    return
  }
  try {
    user.value = await authAPI.me()
  } catch (error) {
    // 仅认证失效时退出，短暂网络故障保留当前登录状态。
    isAuthed.value = Boolean(authStorage.getToken())
    if (!isAuthed.value && !isAuthPage.value) {
      router.replace({
        path: '/login',
        query: route.fullPath === '/' ? {} : { redirect: route.fullPath },
      })
    }
  }
}

const goBack = () => {
  router.push('/')
}

const openNicknameDialog = () => {
  nicknameForm.value = user.value?.nickName || user.value?.userName || ''
  nicknameError.value = ''
  isNicknameDialogOpen.value = true
  nextTick(() => {
    nicknameInput.value?.focus()
  })
}

const closeNicknameDialog = () => {
  if (nicknameSaving.value) return
  isNicknameDialogOpen.value = false
  nicknameError.value = ''
}

const submitNickname = async () => {
  const nextNickName = nicknameForm.value.trim()
  nicknameError.value = ''
  if (!nextNickName) {
    nicknameError.value = '昵称不能为空'
    return
  }
  if (nextNickName.length > 20) {
    nicknameError.value = '昵称不能超过20个字符'
    return
  }

  nicknameSaving.value = true
  try {
    user.value = await authAPI.updateNickname(nextNickName)
    isNicknameDialogOpen.value = false
  } catch (error) {
    nicknameError.value = error.message || '修改昵称失败'
  } finally {
    nicknameSaving.value = false
  }
}

const logout = async () => {
  await authAPI.logout()
  user.value = null
  isAuthed.value = false
  router.push('/login')
}

onMounted(() => {
  refreshAuthState()
  window.addEventListener('auth-changed', refreshAuthState)
})

onUnmounted(() => {
  window.removeEventListener('auth-changed', refreshAuthState)
})
</script>

<template>
  <div class="app" :class="{ dark: isDark }">
    <nav v-if="!isAuthPage" class="navbar" aria-label="主导航">
      <div class="navbar-inner">
        <router-link to="/" class="logo" aria-label="知课行首页">
          <span class="brand-symbol">知</span>
          <span class="brand-name">知课行<small>AI 课程服务平台</small></span>
        </router-link>
        <div v-if="showUserArea" class="nav-links">
          <router-link to="/" :class="{ active: route.path === '/' }">首页</router-link>
          <router-link to="/courses" :class="{ active: route.path.startsWith('/courses') }">课程广场</router-link>
          <router-link to="/agent" :class="{ active: route.path === '/agent' }">Agent 工作台 <span>↗</span></router-link>
        </div>
        <div class="nav-actions">
          <button v-if="showUserArea" class="user-pill" type="button" title="修改昵称" @click="openNicknameDialog">
            <UserCircleIcon class="icon" />
            <span>{{ displayName }}</span>
          </button>
          <button class="icon-btn" type="button" title="切换主题" :aria-label="isDark ? '切换浅色主题' : '切换深色主题'" @click="toggleDark()">
            <SunIcon v-if="isDark" class="icon" />
            <MoonIcon v-else class="icon" />
          </button>
          <button v-if="showBack" class="icon-btn back-btn" type="button" title="返回首页" @click="goBack">
            <ArrowLeftIcon class="icon" />
          </button>
          <button v-if="showUserArea" class="logout-btn" type="button" title="退出登录" @click="logout">
            <ArrowRightOnRectangleIcon class="icon" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </nav>
    <div v-if="['/ai-chat', '/customer-service', '/chat-pdf', '/game', '/comfort-simulator'].includes(route.path)" class="legacy-notice">您正在使用经典应用。新版支持完整历史、文档引用与预约审批。<router-link to="/agent">进入 Agent 工作台 →</router-link></div>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <div v-if="showUserArea && isNicknameDialogOpen" class="nickname-overlay" @click.self="closeNicknameDialog">
      <form class="nickname-dialog" @submit.prevent="submitNickname">
        <button class="dialog-close" type="button" title="关闭" @click="closeNicknameDialog">
          <XMarkIcon class="icon" />
        </button>
        <div class="dialog-heading">
          <p>个人资料</p>
          <h2>修改昵称</h2>
        </div>
        <label class="nickname-field">
          <span>昵称</span>
          <input
            ref="nicknameInput"
            v-model="nicknameForm"
            type="text"
            maxlength="20"
            placeholder="请输入昵称"
            autocomplete="nickname"
          >
        </label>
        <p v-if="nicknameError" class="dialog-error">{{ nicknameError }}</p>
        <div class="dialog-actions">
          <button class="secondary-btn" type="button" :disabled="nicknameSaving" @click="closeNicknameDialog">
            取消
          </button>
          <button class="primary-btn" type="submit" :disabled="nicknameSaving">
            <CheckIcon class="icon" />
            <span>{{ nicknameSaving ? '保存中' : '保存' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss">
:root {
  --bg-color: #f7f8f5;
  --text-color: #142a2c;
}

.dark {
  --bg-color: #17231f;
  --text-color: #e8f2e9;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  min-height: 100vh;
  color: var(--text-color);
  background: var(--bg-color);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}

button,
input {
  font: inherit;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  height: 65px;
  flex: 0 0 65px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 253, 249, 0.92);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(29, 75, 55, 0.09);

  .navbar-inner {
    width: min(1320px, calc(100% - 52px));
    height: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 48px;
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
    text-decoration: none;
    color: #183d32;
  }

  .brand-symbol {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: #f6fff8;
    background: linear-gradient(140deg, #225f4c, #13845d);
    box-shadow: 0 5px 13px rgba(13, 101, 66, 0.18);
    font-size: 18px;
    font-weight: 900;
  }

  .brand-name {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 17px;
    font-weight: 850;
    line-height: 1.1;
    letter-spacing: 0.06em;

    small {
      color: #81958a;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 24px;
    height: 100%;

    a {
      height: 100%;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      position: relative;
      color: #60786b;
      text-decoration: none;
      font-size: 12px;
      font-weight: 750;
      white-space: nowrap;
      transition: color .2s ease;

      &::after {
        content: '';
        height: 2px;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background: #32835e;
        transform: scaleX(0);
        transition: transform .2s ease;
      }

      &:hover,
      &.active { color: #1b6346; }
      &.active::after { transform: scaleX(1); }
      span { color: #4f9e70; }
    }
  }

  .nav-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-pill {
    max-width: 210px;
    height: 35px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border-radius: 9px;
    color: #315e4c;
    background: #edf6ef;
    border: 1px solid #dcece0;
    cursor: pointer;
    font-size: 11px;
    font-weight: 760;
    transition: background-color .2s ease, border-color .2s ease;

    &:hover {
      border-color: #a3d5b4;
      background: #e3f3e8;
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .icon-btn,
  .logout-btn {
    width: 35px;
    height: 35px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e0e9e2;
    border-radius: 9px;
    background: #fff;
    color: #3f6555;
    cursor: pointer;
    transition: background-color .2s ease, border-color .2s ease, color .2s ease;

    &:hover {
      color: #177d51;
      border-color: #b4d8bd;
      background: #f1f8f1;
    }
  }

  .logout-btn {
    width: auto;
    min-width: 91px;
    gap: 6px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 750;
  }

  .icon {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  a:focus-visible,
  button:focus-visible { outline: 3px solid #72d6a1; outline-offset: 3px; }
}

.legacy-notice { padding: 9px 20px; background: #edf4f0; color: #527365; font-size: 12px; text-align: center; }
.legacy-notice a { margin-left: 12px; color: #285e4e; font-weight: 600; }
.dark .legacy-notice { background: #26372e; color: #a5c4b2; }
.dark .legacy-notice a { color: #a5d8c0; }

.nickname-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(6px);
}

.nickname-dialog {
  width: min(420px, 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);

  .dialog-close {
    position: absolute;
    top: 0.85rem;
    right: 0.85rem;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    background: transparent;
    color: #475467;
    cursor: pointer;

    &:hover {
      color: #1b8d60;
      border-color: rgba(27, 141, 96, 0.28);
      background: rgba(27, 141, 96, 0.08);
    }
  }

  .dialog-heading {
    padding-right: 2.4rem;

    p {
      color: #667085;
      font-size: 0.85rem;
      font-weight: 700;
    }

    h2 {
      margin-top: 0.2rem;
      font-size: 1.35rem;
      line-height: 1.25;
    }
  }

  .nickname-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    color: #344054;
    font-weight: 700;

    input {
      width: 100%;
      min-height: 44px;
      padding: 0 0.8rem;
      border-radius: 8px;
      border: 1px solid rgba(15, 23, 42, 0.14);
      outline: none;
      color: #1f2937;
      background: #ffffff;

      &:focus {
        border-color: rgba(27, 141, 96, 0.58);
        box-shadow: 0 0 0 3px rgba(27, 141, 96, 0.12);
      }
    }
  }

  .dialog-error {
    min-height: 20px;
    color: #d92d20;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
  }

  .secondary-btn,
  .primary-btn {
    min-width: 96px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0 0.9rem;
    border-radius: 8px;
    border: 1px solid rgba(15, 23, 42, 0.14);
    cursor: pointer;
    font-weight: 800;
    white-space: nowrap;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.66;
    }
  }

  .primary-btn .icon {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  .secondary-btn {
    color: #344054;
    background: #ffffff;
  }

  .primary-btn {
    color: #ffffff;
    border-color: #1b8d60;
    background: #1b8d60;

    &:hover:not(:disabled) {
      background: #13764f;
    }
  }
}

.dark {
  .navbar {
    background: rgba(24, 38, 32, 0.94);
    border-bottom-color: rgba(255, 255, 255, 0.08);

    .logo {
      color: #e4f5e8;
    }

    .brand-name small {
      color: #9db6a5;
    }

    .nav-links a {
      color: #abc2b2;
      &:hover,
      &.active { color: #8ee1b1; }
    }

    .user-pill,
    .icon-btn,
    .logout-btn {
      color: #e6f3e9;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
    }
  }

  .nickname-dialog {
    color: #f4f7fb;
    background: rgba(31, 36, 46, 0.98);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);

    .dialog-close {
      color: #d0d5dd;
      border-color: rgba(255, 255, 255, 0.12);
    }

    .dialog-heading p,
    .nickname-field {
      color: #d0d5dd;
    }

    .nickname-field input {
      color: #f4f7fb;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .secondary-btn {
      color: #f4f7fb;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .navbar {
    .navbar-inner { width: calc(100% - 28px); gap: 18px; }
    .nav-links { gap: 12px; }
    .user-pill { max-width: 100px; }
    .logout-btn {
      min-width: 35px;
      padding: 0;

      span { display: none; }
    }
  }
}
@media (max-width: 600px) {
  .navbar {
    .navbar-inner { gap: 9px; }
    .brand-name small { display: none; }
    .nav-links a:first-child { display: none; }
    .nav-links a { font-size: 11px; }
    .nav-links a span { display: none; }
    .nav-actions { gap: 5px; }
    .user-pill { width: 35px; padding: 0; justify-content: center; }
    .user-pill span { display: none; }
    .back-btn { display: none; }
  }
}
@media (max-width: 390px) {
  .navbar {
    .brand-name { display: none; }
    .nav-links a { font-size: 10px; }
    .nav-actions { gap: 4px; }
  }
}
</style>
