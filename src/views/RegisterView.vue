<template>
  <main class="auth-page" :class="{ dark: isDark }">
    <section class="auth-shell" aria-label="知课行账户注册">
      <div class="auth-copy">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">知</span>
          <span><strong>知课行</strong><small>AI 课程服务平台</small></span>
        </div>

        <div class="hero-message">
          <span class="hero-kicker"><span class="kicker-line"></span> 开始你的个性化学习旅程</span>
          <h1>从找到好课程，<br><em>走向更好的自己。</em></h1>
          <p class="auth-lead">创建账户，探索课程、检索知识，并通过 AI 助手办理免费试听预约。学习计划，从这里开始。</p>
        </div>

        <div class="showcase" aria-label="知课行服务预览">
          <div class="showcase-top">
            <span class="assistant-avatar"><SparklesIcon /></span>
            <span class="showcase-title"><strong>知课行 AI 助手</strong><small>课程与知识，随问随答</small></span>
            <span class="online-badge">服务预览</span>
          </div>
          <div class="showcase-question">这门课适合我吗？试听怎么预约？</div>
          <div class="showcase-answer">
            <span class="answer-symbol"><SparklesIcon /></span>
            <p>告诉我你的学习目标，我会帮你了解课程，也能为你查询试听活动与审批进度。</p>
          </div>
          <div class="showcase-tags"><span>课程咨询</span><span>知识检索</span><span>Agent 审批</span></div>
        </div>

        <p class="hero-footer">课程发现 <span></span> 智能答疑 <span></span> 试听预约</p>
      </div>

      <form class="auth-panel" @submit.prevent="submit">
        <div class="form-content">
          <div class="form-eyebrow"><span class="eyebrow-dot"></span> 加入知课行</div>
          <div class="panel-heading">
            <h2>创建你的学习账户</h2>
            <p>只需填写以下信息，即可开启智能学习体验。</p>
          </div>

          <div class="field-stack">
            <div class="field-control">
              <label class="field-label" for="register-username">用户名</label>
              <div class="input-wrap">
                <UserIcon class="input-icon" />
                <input id="register-username" v-model.trim="form.userName" type="text" maxlength="11" autocomplete="username" placeholder="设置用户名" required>
              </div>
            </div>

            <div class="field-control">
              <label class="field-label" for="register-password">密码</label>
              <div class="input-wrap">
                <LockClosedIcon class="input-icon" />
                <input id="register-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="设置密码" required>
                <button class="visibility-btn" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click.prevent="showPassword = !showPassword">
                  <EyeSlashIcon v-if="showPassword" /><EyeIcon v-else />
                </button>
              </div>
            </div>

            <div class="field-control">
              <label class="field-label" for="register-confirm-password">确认密码</label>
              <div class="input-wrap">
                <LockClosedIcon class="input-icon" />
                <input id="register-confirm-password" v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="再次输入密码" required>
                <button class="visibility-btn" type="button" :aria-label="showConfirmPassword ? '隐藏确认密码' : '显示确认密码'" @click.prevent="showConfirmPassword = !showConfirmPassword">
                  <EyeSlashIcon v-if="showConfirmPassword" /><EyeIcon v-else />
                </button>
              </div>
            </div>
          </div>

          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <button class="submit-btn" type="submit" :disabled="loading || retrySeconds > 0">
            <span>{{ retrySeconds > 0 ? `请在 ${retrySeconds} 秒后重试` : loading ? '正在创建…' : '创建账户' }}</span>
            <ArrowRightIcon class="btn-icon" />
          </button>

          <div class="switch-line">
            <span>已有账户？</span>
            <router-link to="/login">返回登录 <ArrowUpRightIcon /></router-link>
          </div>
        </div>
        <div class="panel-footer"><ShieldCheckIcon /> 安心学习，账户信息安全保护</div>
      </form>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const form = reactive({ userName: '', password: '', confirmPassword: '' })
const { retrySeconds, waitBeforeRetry } = useAuthRetry()

const submit = async () => {
  if (loading.value || retrySeconds.value > 0) return
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
    if (err.retryAfter > 0) waitBeforeRetry(err.retryAfter)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../assets/auth.css"></style>
