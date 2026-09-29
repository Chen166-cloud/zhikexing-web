<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { courseApi, coursePrice, educationLabel, type Course } from '../features/courses/api'
import { ApiError } from '../features/agent/api'
import { errorMessage } from '../features/agent/types'
import '../features/courses/courses.css'

const route = useRoute()
const course = ref<Course | null>(null)
const loading = ref(false)
const error = ref('')
const missing = ref(false)
const consultationLink = computed(() => ({ path: '/agent', query: { courseId: course.value?.id, courseName: course.value?.name } }))
let requestId = 0
async function load() {
  const current = ++requestId
  loading.value = true
  error.value = ''
  missing.value = false
  try {
    const item = await courseApi.detail(String(route.params.id))
    if (current === requestId) course.value = item
  } catch (failure) {
    if (current !== requestId) return
    missing.value = failure instanceof ApiError && failure.status === 404
    error.value = errorMessage(failure)
  } finally {
    if (current === requestId) loading.value = false
  }
}
watch(() => route.params.id, (id) => { if (typeof id === 'string') void load() }, { immediate: true })
</script>

<template>
  <main class="courses-page course-detail-page">
    <router-link class="courses-text-link course-back" to="/courses"><ArrowLeftIcon /> 返回课程广场</router-link>
    <div v-if="loading" class="course-state" role="status"><span class="course-spinner"></span><p>正在加载课程…</p></div>
    <div v-else-if="error" class="course-state" role="alert">
      <h1>{{ missing ? '没有找到这门课程' : '课程暂时未能加载' }}</h1>
      <p>{{ missing ? '请返回课程广场，选择其他课程。' : error }}</p>
      <button v-if="!missing" class="course-button secondary" @click="load">重新加载</button>
      <router-link v-else class="course-button" to="/courses">浏览其他课程</router-link>
    </div>
    <template v-else-if="course">
      <section class="course-detail-hero" aria-labelledby="course-title">
        <div class="course-detail-art" aria-hidden="true"><BookOpenIcon /><span>知课行 · 课程探索</span></div>
        <div class="course-detail-copy">
          <span class="course-type">{{ course.type || '综合课程' }}</span>
          <h1 id="course-title">{{ course.name }}</h1>
          <p>了解基本信息，找到适合自己的学习方向。</p>
          <strong class="course-detail-price">{{ coursePrice(course.price) }}</strong>
          <dl class="course-detail-facts">
            <div><dt>学习周期</dt><dd>{{ course.duration === null ? '待补充' : `${course.duration} 天` }}</dd></div>
            <div><dt>最低学历要求</dt><dd>{{ educationLabel(course.edu) }}</dd></div>
          </dl>
          <router-link :to="consultationLink" class="course-button">咨询这门课程 <ArrowRightIcon /></router-link>
        </div>
      </section>
      <section class="course-consultation">
        <ChatBubbleLeftRightIcon />
        <div><h2>把你的目标告诉 Agent</h2><p>进一步了解课程要求、学习安排与预约方式。点击咨询后，工作台会为你准备问题，确认内容后再发送。</p></div>
        <router-link :to="consultationLink" class="courses-text-link">开始咨询 <ArrowRightIcon /></router-link>
      </section>
    </template>
  </main>
</template>
