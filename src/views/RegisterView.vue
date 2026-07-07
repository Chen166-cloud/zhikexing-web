<template>
  <main class="auth-page" :class="{ dark: isDark }">
    <section class="auth-shell">
      <div class="auth-copy">
        <p class="eyebrow">Tim's AI Hub</p>
        <h1>创建账户</h1>
        <p class="auth-lead">只需一步，开启你的工作台。</p>
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
          <p>新账户</p>
          <h2>注册</h2>
        </div>

        <label>
          <span>用户名</span>
          <div class="input-wrap">
            <UserPlusIcon class="input-icon" />
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
              autocomplete="new-password"
              placeholder="请输入密码"
              required
            >
          </div>
        </label>

        <label>
          <span>确认密码</span>
          <div class="input-wrap">
            <LockClosedIcon class="input-icon" />
            <input
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              required
            >
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="submit-btn" :disabled="loading">
          <UserPlusIcon class="btn-icon" />
          <span>{{ loading ? '注册中' : '注册' }}</span>
        </button>

        <p class="switch-line">
          已有账号？
          <router-link to="/login">去登录</router-link>
        </p>
      </form>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import {
  LockClosedIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline'
import { authAPI } from '../services/api'

const isDark = useDark()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const form = reactive({
  userName: '',
  password: '',
  confirmPassword: '',
})

const submit = async () => {
  error.value = ''
  if (!form.userName || !form.password || !form.confirmPassword) {
    error.value = '请完整填写注册信息'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await authAPI.register(form.userName, form.password)
    router.push('/')
  } catch (err) {
    error.value = err.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../assets/auth.css"></style>
