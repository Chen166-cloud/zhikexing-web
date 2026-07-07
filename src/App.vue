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
const displayName = computed(() => user.value?.nickName || user.value?.userName || '用户')

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
    user.value = null
    isAuthed.value = false
    if (!isAuthPage.value) {
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
    <nav class="navbar">
      <router-link to="/" class="logo">Tim's AI Hub</router-link>
      <div class="nav-actions">
        <button v-if="showUserArea" class="user-pill" type="button" title="修改昵称" @click="openNicknameDialog">
          <UserCircleIcon class="icon" />
          <span>{{ displayName }}</span>
        </button>
        <button class="icon-btn" title="切换主题" @click="toggleDark()">
          <SunIcon v-if="isDark" class="icon" />
          <MoonIcon v-else class="icon" />
        </button>
        <button v-if="showBack" class="icon-btn" title="返回首页" @click="goBack">
          <ArrowLeftIcon class="icon" />
        </button>
        <button v-if="showUserArea" class="logout-btn" title="退出登录" @click="logout">
          <ArrowRightOnRectangleIcon class="icon" />
          <span>退出登录</span>
        </button>
      </div>
    </nav>
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
  --bg-color: #f5f7fb;
  --text-color: #1f2937;
}

.dark {
  --bg-color: #171a21;
  --text-color: #f4f7fb;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);

  .logo {
    font-size: 1.35rem;
    font-weight: 800;
    text-decoration: none;
    color: #006ed4;
    letter-spacing: 0;
  }

  .nav-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .user-pill {
    max-width: 220px;
    height: 36px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0 0.75rem;
    border-radius: 8px;
    color: #344054;
    background: rgba(0, 124, 240, 0.08);
    border: 1px solid rgba(0, 124, 240, 0.18);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;

    &:hover {
      color: #007cf0;
      border-color: rgba(0, 124, 240, 0.36);
      background: rgba(0, 124, 240, 0.12);
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .icon-btn,
  .logout-btn {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    color: var(--text-color);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;

    &:hover {
      color: #007cf0;
      border-color: rgba(0, 124, 240, 0.36);
      background: rgba(0, 124, 240, 0.08);
    }
  }

  .logout-btn {
    width: auto;
    min-width: 96px;
    gap: 0.35rem;
    padding: 0 0.75rem;
    font-weight: 700;
  }

  .icon {
    width: 21px;
    height: 21px;
    flex: 0 0 auto;
  }
}

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
      color: #007cf0;
      border-color: rgba(0, 124, 240, 0.28);
      background: rgba(0, 124, 240, 0.08);
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
        border-color: rgba(0, 124, 240, 0.58);
        box-shadow: 0 0 0 3px rgba(0, 124, 240, 0.12);
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
    border-color: #007cf0;
    background: #007cf0;

    &:hover:not(:disabled) {
      background: #006ed4;
    }
  }
}

.dark {
  .navbar {
    background: rgba(23, 26, 33, 0.86);
    border-bottom-color: rgba(255, 255, 255, 0.08);

    .logo {
      color: #62b9ff;
    }

    .user-pill,
    .icon-btn,
    .logout-btn {
      color: #f4f7fb;
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
    padding: 0.75rem 1rem;

    .logo {
      font-size: 1.1rem;
    }

    .user-pill {
      max-width: 120px;
    }

    .logout-btn {
      min-width: 36px;
      padding: 0;

      span {
        display: none;
      }
    }
  }
}
</style>
