<template>
  <main class="auth-page" :class="{ dark: isDark }">
    <section class="auth-shell" aria-label="知课行账户登录">
      <div class="auth-copy">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">知</span>
          <span><strong>知课行</strong><small>AI 课程服务平台</small></span>
        </div>

        <div class="hero-message">
          <span class="hero-kicker"><span class="kicker-line"></span> 为更好的学习体验而来</span>
          <h1>让好课程，<br><em>从一次对话开始。</em></h1>
          <p class="auth-lead">发现适合自己的课程，向 AI 助手提问，预约热门课程试听。学习路上的每一步，都更有方向。</p>
        </div>

        <div class="showcase" aria-label="知课行服务预览">
          <div class="showcase-top">
            <span class="assistant-avatar"><SparklesIcon /></span>
            <span class="showcase-title"><strong>知课行 AI 助手</strong><small>课程与知识，随问随答</small></span>
            <span class="online-badge">服务预览</span>
          </div>
          <div class="showcase-question">我想了解 AI Agent 开发，可以先试听吗？</div>
          <div class="showcase-answer">
            <span class="answer-symbol"><SparklesIcon /></span>
            <p>当然可以。先了解课程内容和适合人群，再查看当前开放的免费试听活动。</p>
          </div>
          <div class="showcase-tags"><span>课程咨询</span><span>知识检索</span><span>试听办理</span></div>
        </div>

        <p class="hero-footer">课程发现 <span></span> 智能答疑 <span></span> 试听预约</p>
      </div>

      <form class="auth-panel" @submit.prevent="submit">
        <div class="form-content">
          <div class="form-eyebrow"><span class="eyebrow-dot"></span> 欢迎来到知课行</div>
          <div class="panel-heading">
            <h2>登录你的学习空间</h2>
            <p>继续探索课程，让 AI 助手陪你完成下一步。</p>
          </div>

          <div class="field-stack">
            <div class="field-control">
              <label class="field-label" for="login-username">用户名</label>
              <div class="input-wrap">
                <UserIcon class="input-icon" />
                <input id="login-username" v-model.trim="form.userName" type="text" maxlength="11" autocomplete="username" placeholder="请输入用户名" required>
              </div>
            </div>

            <div class="field-control">
              <label class="field-label" for="login-password">密码</label>
              <div class="input-wrap">
                <LockClosedIcon class="input-icon" />
                <input id="login-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入密码" required>
                <button class="visibility-btn" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click.prevent="showPassword = !showPassword">
                  <EyeSlashIcon v-if="showPassword" /><EyeIcon v-else />
                </button>
              </div>
            </div>
          </div>

          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <button class="submit-btn" type="submit" :disabled="loading || retrySeconds > 0">
            <span>{{ retrySeconds > 0 ? `请在 ${retrySeconds} 秒后重试` : loading ? '正在登录…' : '进入学习空间' }}</span>
            <ArrowRightIcon class="btn-icon" />
          </button>

          <div class="switch-line">
            <span>还没有账户？</span>
            <router-link to="/register">免费创建账户 <ArrowUpRightIcon /></router-link>
          </div>
        </div>
        <div class="panel-footer"><ShieldCheckIcon /> 安心学习，账户信息安全保护</div>
      </form>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'
import { authAPI } from '../services/api'
import { useAuthRetry } from '../composables/useAuthRetry'

const isDark = useDark()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const form = reactive({ userName: '', password: '' })
const { retrySeconds, waitBeforeRetry } = useAuthRetry()

const submit = async () => {
  if (loading.value || retrySeconds.value > 0) return
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
    error.value = err.message || '登录失败'
    if (err.retryAfter > 0) waitBeforeRetry(err.retryAfter)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../assets/auth.css"></style>
