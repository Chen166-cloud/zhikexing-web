<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRightIcon, BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { courseApi, coursePrice, educationLabel, educationLabels, type CoursePage } from '../features/courses/api'
import { errorMessage } from '../features/agent/types'
import '../features/courses/courses.css'

const keyword = ref('')
const courseType = ref('')
const edu = ref('')
const order = ref('id:asc')
const loading = ref(false)
const error = ref('')
const requestedPage = ref(1)
const result = ref<CoursePage>({ items: [], total: 0, page: 1, pageSize: 12 })
const pageCount = computed(() => Math.max(1, Math.ceil(result.value.total / result.value.pageSize)))
let appliedFilters: Record<string, string | number> = {}

async function load(page = 1) {
  requestedPage.value = page
  loading.value = true
  error.value = ''
  try {
    result.value = await courseApi.list({ ...appliedFilters, page, pageSize: 12 })
  } catch (failure) {
    error.value = errorMessage(failure)
  } finally {
    loading.value = false
  }
}
function search() {
  if (loading.value) return
  const [sortBy = 'id', direction = 'asc'] = order.value.split(':')
  appliedFilters = { sortBy, ascending: String(direction === 'asc') }
  if (keyword.value.trim()) appliedFilters.keyword = keyword.value.trim()
  if (courseType.value.trim()) appliedFilters.type = courseType.value.trim()
  if (edu.value !== '') appliedFilters.edu = edu.value
  void load()
}
function reset() {
  keyword.value = ''
  courseType.value = ''
  edu.value = ''
  order.value = 'id:asc'
  search()
}
onMounted(() => void load())
</script>

<template>
  <main class="courses-page">
    <header class="courses-heading">
      <div>
        <p class="courses-eyebrow">发现适合你的下一步</p>
        <h1>课程广场</h1>
        <p>先了解课程方向、学习周期与费用，再与 Agent 一起规划。</p>
      </div>
      <router-link class="courses-text-link" to="/agent">向 Agent 咨询 <ArrowRightIcon /></router-link>
    </header>

    <form class="course-filters" aria-label="筛选课程" @submit.prevent="search">
      <label class="course-search">
        <span>课程名称</span>
        <div class="course-search-input"><MagnifyingGlassIcon /><input v-model="keyword" maxlength="100" placeholder="搜索感兴趣的课程" type="search"></div>
      </label>
      <label>
        <span>课程方向</span>
        <input v-model="courseType" maxlength="50" placeholder="全部方向，如编程">
      </label>
      <label>
        <span>我的学历</span>
        <select v-model="edu">
          <option value="">全部要求</option>
          <option v-for="(label, value) in educationLabels" :key="value" :value="String(value)">{{ value === 0 ? '无学历背景' : label }}</option>
        </select>
      </label>
      <label>
        <span>排序方式</span>
        <select v-model="order">
          <option value="id:asc">默认排序</option>
          <option value="price:asc">价格从低到高</option>
          <option value="price:desc">价格从高到低</option>
          <option value="duration:asc">学习周期从短到长</option>
          <option value="duration:desc">学习周期从长到短</option>
        </select>
      </label>
      <div class="course-filter-actions">
        <button class="course-button" type="submit" :disabled="loading">搜索课程</button>
        <button class="course-button secondary" type="button" :disabled="loading" @click="reset">重置</button>
      </div>
    </form>

    <section aria-label="课程列表" :aria-busy="loading" aria-live="polite">
      <div v-if="loading" class="course-state"><span class="course-spinner"></span><p>正在查找课程…</p></div>
      <div v-else-if="error" class="course-state" role="alert">
        <h2>课程暂时未能加载</h2><p>{{ error }}</p>
        <button class="course-button secondary" @click="load(requestedPage)">重新加载</button>
      </div>
      <div v-else-if="!result.items.length" class="course-state">
        <BookOpenIcon /><h2>没有找到符合条件的课程</h2><p>试试其他名称或放宽筛选条件。</p>
        <button class="course-button secondary" @click="reset">查看全部课程</button>
      </div>
      <template v-else>
        <div class="course-results-heading"><h2>探索课程</h2><span>共 {{ result.total }} 门</span></div>
        <div class="course-grid">
          <router-link v-for="course in result.items" :key="course.id" :to="`/courses/${course.id}`" class="course-card">
            <div class="course-card-top"><span class="course-book"><BookOpenIcon /></span><span class="course-type">{{ course.type || '综合课程' }}</span></div>
            <h3>{{ course.name }}</h3>
            <dl class="course-card-facts">
              <div><dt>学习周期</dt><dd>{{ course.duration === null ? '待补充' : `${course.duration} 天` }}</dd></div>
              <div><dt>最低学历</dt><dd>{{ educationLabel(course.edu) }}</dd></div>
            </dl>
            <div class="course-card-bottom"><strong>{{ coursePrice(course.price) }}</strong><span>了解课程 <ArrowRightIcon /></span></div>
          </router-link>
        </div>
        <nav class="course-pagination" aria-label="课程分页">
          <button class="course-button secondary" :disabled="result.page <= 1" @click="load(result.page - 1)">上一页</button>
          <span>第 {{ result.page }} / {{ pageCount }} 页</span>
          <button class="course-button secondary" :disabled="result.page >= pageCount" @click="load(result.page + 1)">下一页</button>
        </nav>
      </template>
    </section>
  </main>
</template>
