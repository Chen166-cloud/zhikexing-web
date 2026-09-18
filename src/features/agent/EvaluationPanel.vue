<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { NButton, NInput, NSelect, NAlert, NEmpty, NTag, NSpin } from 'naive-ui'
import { useAgentStore } from '../../stores/agent'
import { agentApi } from './api'
import {
  errorMessage,
  statusLabel,
  type Evaluation,
  type EvaluationCase,
  type Metrics,
} from './types'

const store = useAgentStore()
const metrics = ref<Metrics | null>(null)
const batches = ref<Evaluation[]>([])
const selected = ref<Evaluation | null>(null)
const library = ref('')
const cases = ref<EvaluationCase[]>([{ question: '', expectedText: '' }])
const busy = ref(false)
const error = ref('')
const options = computed(() =>
  store.knowledgeBases.map((item) => ({ label: item.name, value: item.id }))
)
let generation = 0
let selection = 0
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  options,
  (values) => {
    if (!values.some((item) => item.value === library.value)) library.value = values[0]?.value || ''
  },
  { immediate: true }
)

async function refresh() {
  const current = generation
  const workspace = store.workspaceId
  if (!workspace) return
  error.value = ''
  try {
    const [stats, items] = await Promise.all([
      agentApi.metrics(workspace),
      agentApi.evaluations(workspace),
    ])
    if (current !== generation) return
    metrics.value = stats
    batches.value = items
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  }
}
watch(
  () => store.workspaceId,
  () => {
    generation++
    clearTimeout(timer)
    batches.value = []
    selected.value = null
    metrics.value = null
    error.value = ''
    void refresh()
  },
  { immediate: true }
)

async function open(id: string) {
  const current = generation
  const currentSelection = ++selection
  clearTimeout(timer)
  try {
    const result = await agentApi.evaluation(id, store.workspaceId)
    if (current !== generation || currentSelection !== selection) return
    selected.value = result
    if (['QUEUED', 'RUNNING', 'PROCESSING'].includes(result.status))
      timer = setTimeout(() => void open(id), 2000)
    else await refresh()
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  }
}
async function evaluate() {
  const valid = cases.value
    .filter((item) => item.question.trim())
    .map((item) => ({
      question: item.question.trim(),
      expectedText: item.expectedText?.trim() || undefined,
      expectedDocumentId: item.expectedDocumentId?.trim() || undefined,
    }))
  if (!valid.length) {
    error.value = '请至少填写一个评测问题'
    return
  }
  busy.value = true
  error.value = ''
  const current = generation
  try {
    const batch = await agentApi.evaluate(store.workspaceId, library.value, valid)
    if (current !== generation) return
    await refresh()
    await open(batch.id)
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => {
  generation++
  clearTimeout(timer)
})
</script>

<template>
  <section class="panel-content">
    <div class="section-heading">
      <div>
        <p class="eyebrow">EVALUATIONS</p>
        <h2>评测与用量</h2>
        <p class="muted">用实际问题检验回答质量，查看每次任务的执行结果。</p>
      </div>
      <NButton @click="refresh">刷新指标</NButton>
    </div>
    <NAlert v-if="error" type="error" closable @close="error = ''">{{ error }}</NAlert>
    <div v-if="metrics" class="metric-grid">
      <div class="metric-card">
        <span>运行总数</span><strong>{{ metrics.runCount }}</strong>
      </div>
      <div class="metric-card">
        <span>任务成功率</span
        ><strong>{{ (metrics.successRate * 100).toFixed(1) }}<small>%</small></strong>
      </div>
      <div class="metric-card">
        <span>累计 Tokens</span><strong>{{ metrics.totalTokens.toLocaleString() }}</strong>
      </div>
      <div class="metric-card">
        <span>Agent 聊天估算费用</span
        ><strong
          ><small v-if="metrics.estimatedCostCny !== null">¥</small
          >{{
            metrics.estimatedCostCny === null ? '—' : metrics.estimatedCostCny.toFixed(4)
          }}</strong
        >
      </div>
    </div>
    <p v-if="metrics" class="muted">
      平均任务耗时 {{ (metrics.averageLatencyMs / 1000).toFixed(2) }} 秒 ·
      <template v-if="metrics.estimatedCostCny === null"
        >{{ metrics.unknownUsageRuns || 0 }} 次运行费用待统计，已知部分 ¥{{
          (metrics.knownCostCny || 0).toFixed(4)
        }}。</template
      ><template v-else>费用来自 Agent 聊天运行记录的估算。</template>
      不含文档向量化与评测调用费用。
    </p>
    <div class="evaluation-form">
      <div class="section-heading">
        <h3>创建评测批次</h3>
        <NSelect
          v-model:value="library"
          :options="options"
          placeholder="选择评测知识库"
          aria-label="评测知识库"
          style="width: 240px"
        />
      </div>
      <p class="muted">
        填写问题与可选的预期答案片段、目标文档 ID；结果逐例展示，便于定位失败原因。
      </p>
      <div v-for="(item, index) in cases" :key="index" class="evaluation-case">
        <span class="case-number">{{ String(index + 1).padStart(2, '0') }}</span>
        <NInput
          v-model:value="item.question"
          placeholder="评测问题（必填）"
          :aria-label="`评测问题 ${index + 1}`"
        />
        <NInput
          v-model:value="item.expectedText"
          placeholder="预期答案包含的文字"
          :aria-label="`预期答案 ${index + 1}`"
        />
        <NInput
          v-model:value="item.expectedDocumentId"
          placeholder="目标文档 ID（可选）"
          :aria-label="`目标文档 ${index + 1}`"
        />
        <NButton quaternary :disabled="cases.length === 1" @click="cases.splice(index, 1)"
          >移除</NButton
        >
      </div>
      <div class="form-actions">
        <NButton
          :disabled="cases.length >= 50"
          @click="cases.push({ question: '', expectedText: '' })"
          >＋ 添加问题</NButton
        ><NButton type="primary" :loading="busy" :disabled="!library || busy" @click="evaluate"
          >运行评测</NButton
        >
      </div>
    </div>
    <div class="section-heading">
      <h3>历史批次</h3>
      <span class="muted">{{ batches.length }} 个批次</span>
    </div>
    <NEmpty v-if="!batches.length" description="创建第一批问题，建立质量基线" />
    <div class="batch-list">
      <button
        v-for="batch in batches"
        :key="batch.id"
        class="batch-card"
        :class="{ selected: selected?.id === batch.id }"
        @click="open(batch.id)"
      >
        <span>{{ new Date(batch.createdAt).toLocaleString('zh-CN') }}</span
        ><NTag size="small" :bordered="false">{{ statusLabel(batch.status) }}</NTag
        ><small>{{ batch.id.slice(0, 12) }}</small>
      </button>
    </div>
    <NSpin :show="busy">
      <div v-if="selected" class="evaluation-results">
        <div class="section-heading">
          <h3>批次结果</h3>
          <NTag type="info" :bordered="false">{{ statusLabel(selected.status) }}</NTag>
        </div>
        <p v-if="selected.summary?.total !== undefined" class="muted">
          {{ selected.summary.passed }} /
          {{ selected.summary.scored ?? selected.summary.total }} 已评分问题通过 · 共
          {{ selected.summary.total }} 题 · 通过率
          {{
            selected.summary.passRate === null
              ? '待评分'
              : `${(selected.summary.passRate * 100).toFixed(1)}%`
          }}
          · 平均 {{ (selected.summary.averageLatencyMs / 1000).toFixed(2) }} 秒
        </p>
        <article
          v-for="(result, index) in selected.results || []"
          :key="index"
          class="evaluation-result"
        >
          <div class="section-heading">
            <strong>{{ index + 1 }}. {{ result.question }}</strong
            ><NTag
              :type="result.passed == null ? 'default' : result.passed ? 'success' : 'error'"
              size="small"
              >{{ result.passed == null ? '未评分' : result.passed ? '通过' : '未通过' }}</NTag
            >
          </div>
          <p class="result-answer">{{ result.answer || result.error || '暂无回答' }}</p>
          <p class="muted">
            预期：{{ result.expectedText || '未设置文字断言' }} · 耗时
            {{ ((result.latencyMs || 0) / 1000).toFixed(2) }} 秒 ·
            {{ result.citations?.length || 0 }} 条引用
          </p>
        </article>
      </div>
    </NSpin>
  </section>
</template>
