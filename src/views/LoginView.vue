<template>
  <main class="auth-page" :class="{ dark: isDark }">
    <section class="auth-shell">
      <div class="auth-copy">
        <p class="eyebrow">Tim's AI Hub</p>
        <h1>欢迎回来</h1>
        <p class="auth-lead">使用你的账户继续。</p>
        <div class="glass-preview" aria-hidden="true">
          <div class="preview-toolbar">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="preview-grid">
            <span class="preview-line wide"></span>
            <span class="preview-line"></span>
            <span class="preview-tile"></span>
            <span class="preview-tile soft"></span>
          </div>
        </div>
      </div>

      <form class="auth-panel" @submit.prevent="submit">
        <div class="panel-heading">
          <p>安全登录</p>
          <h2>登录</h2>
        </div>

        <label>
          <span>用户名</span>
          <div class="input-wrap">
            <UserIcon class="input-icon" />
            <input
              v-model.trim="form.userName"
              type="text"
              maxlength="11"
              autocomplete="username"
              placeholder="请输入用户名"
              required
            >
          </div>
        </label>

        <label>
          <span>密码</span>
          <div class="input-wrap">
            <LockClosedIcon class="input-icon" />
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              required
            >
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="submit-btn" :disabled="loading">
          <ArrowRightOnRectangleIcon class="btn-icon" />
          <span>{{ loading ? '登录中' : '登录' }}</span>
        </button>

        <p class="switch-line">
          还没有账号？
          <router-link to="/register">注册账号</router-link>
        </p>
      </form>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import {
  ArrowRightOnRectangleIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'
import { authAPI } from '../services/api'

const isDark = useDark()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const form = reactive({
  userName: '',
  password: '',
})

const submit = async () => {
  error.value = ''
  if (!form.userName || !form.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await authAPI.login(form.userName, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message === '用户不存在，请先注册' ? '用户不存在！' : err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../assets/auth.css"></style>
