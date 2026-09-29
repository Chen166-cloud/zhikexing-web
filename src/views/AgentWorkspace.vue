<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import {
  NConfigProvider,
  NButton,
  NInput,
  NSelect,
  NTag,
  NAlert,
  NEmpty,
  NSpin,
  NModal,
  NRadioGroup,
  NRadioButton,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui'
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  StopIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAgentStore } from '../stores/agent'
import { agentApi } from '../features/agent/api'
import {
  errorMessage,
  statusLabel,
  type Approval,
  type Citation,
  type RunEvent,
  type TrialClaimResult,
} from '../features/agent/types'
import KnowledgePanel from '../features/agent/KnowledgePanel.vue'
import EvaluationPanel from '../features/agent/EvaluationPanel.vue'
import TrialCampaignPanel from '../features/agent/TrialCampaignPanel.vue'
import DocumentPreview from '../features/agent/DocumentPreview.vue'
import '../features/agent/workspace.css'

const store = useAgentStore()
const route = useRoute()
const router = useRouter()
const isDark = useDark()
const tab = ref('assistant')
const draft = ref('')
const mode = ref('agent')
const selectedLibraries = ref<string[]>([])
const workspaceDialog = ref(false)
const workspaceName = ref('')
const actionBusy = ref('')
const preview = ref<Citation | null>(null)
const messageList = ref<HTMLElement | null>(null)
const workspaceOptions = computed(() =>
  store.workspaces.map((item) => ({ label: item.name, value: item.id }))
)
const libraryOptions = computed(() =>
  store.knowledgeBases.map((item) => ({ label: item.name, value: item.id }))
)
const archivedMessages = computed(() => store.conversation?.messages || [])
const hasArchivedAnswer = computed(() =>
  archivedMessages.value.some(
    (item) => item.role === 'assistant' && item.runId === store.run?.runId
  )
)
const pendingUserInput = computed(() =>
  archivedMessages.value.some((item) => item.role === 'user' && item.runId === store.run?.runId)
    ? ''
    : store.run?.input || ''
)
const answer = computed(() => store.liveAnswer || store.run?.answer || '')
const runOptions = computed(() =>
  store.runs
    .filter((item) => item.conversationId === store.conversation?.id)
    .map((item) => ({
      label: `${statusLabel(item.status)} · ${item.input.slice(0, 24)}`,
      value: item.runId,
    }))
)
const visibleEvents = computed(() =>
  store.events.filter((item) => !['message.delta', 'usage.updated'].includes(item.type))
)
const approvalCards = computed(() =>
  store.approvals.map((card) => {
    let trialResult: TrialClaimResult | undefined
    if (card.toolName === 'claim_trial') {
      if (isTrialResult(card.result, card.actionId)) trialResult = card.result
      // 审批 result 是提交时的快照；优先展示同一动作的后续数据库查询结果。
      for (const event of store.events) {
        if (
          event.type === 'tool.completed' &&
          ['claim_trial', 'query_trial_claim'].includes(String(event.data.name)) &&
          isTrialResult(event.data.result, card.actionId)
        ) {
          trialResult = event.data.result
        }
      }
    }
    return { ...card, trialResult }
  })
)
const canSubmit = computed(() =>
  Boolean(
    draft.value.trim() &&
    store.workspaceId &&
    !store.sending &&
    !store.busy &&
    (!store.active || store.run?.status === 'WAITING_INPUT')
  )
)
const renderMarkdown = (content: string) =>
  DOMPurify.sanitize(marked.parse(content, { async: false, breaks: true }) as string)
const eventLabels: Record<string, string> = {
  'run.started': '任务开始',
  'step.started': '执行步骤',
  'tool.started': '调用工具',
  'tool.completed': '工具返回',
  'message.completed': '回答已生成',
  'message.reset': '更新回答',
  'approval.required': '等待您确认',
  'approval.completed': '确认已处理',
  'input.required': '等待补充信息',
  'run.completed': '任务完成',
  'run.failed': '任务失败',
  'run.cancelled': '任务已取消',
}
function eventSummary(event: RunEvent) {
  return String(
    event.data.description ||
      event.data.name ||
      event.data.message ||
      eventLabels[event.type] ||
      event.type
  )
}
function approvalField(key: string) {
  const labels: Record<string, string> = {
    courseName: '课程',
    schoolName: '校区',
    campusName: '校区',
    studentName: '姓名',
    contactInfo: '联系方式',
    remark: '备注',
    courseId: '课程编号',
    schoolId: '校区编号',
    campaignId: '活动编号',
    title: '活动',
    startsAt: '开抢时间',
    endsAt: '结束时间',
    amountCent: '费用',
    notice: '申请说明',
  }
  return labels[key] || key
}
function approvalValue(key: string, value: unknown) {
  if (key === 'amountCent' && typeof value === 'number')
    return value === 0 ? '0 元（免费）' : `${(value / 100).toFixed(2)} 元`
  if (['startsAt', 'endsAt'].includes(key) && typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
  }
  return value
}
function isTrialResult(value: unknown, actionId: string): value is TrialClaimResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<TrialClaimResult>
  return (
    result.actionId === actionId &&
    ['PENDING', 'RESERVED', 'SUCCEEDED', 'REJECTED'].includes(result.status || '')
  )
}
function trialConfirmed(result: TrialClaimResult) {
  return (
    result.status === 'SUCCEEDED' &&
    typeof result.orderId === 'string' &&
    Boolean(result.orderId.trim())
  )
}
function trialResultLabel(result: TrialClaimResult) {
  if (trialConfirmed(result)) return '免费试听名额已确认'
  if (result.status === 'REJECTED') return '未获得免费试听名额'
  if (result.status === 'RESERVED') return '名额已预留，订单仍在处理中'
  if (result.status === 'PENDING') return '申请已受理，仍在处理中'
  return '结果尚待确认，请继续查询'
}
async function action(key: string, operation: () => Promise<unknown>) {
  actionBusy.value = key
  store.error = ''
  try {
    await operation()
  } catch (failure) {
    store.error = errorMessage(failure)
  } finally {
    actionBusy.value = ''
  }
}
async function send() {
  if (!canSubmit.value) return
  const text = draft.value.trim()
  if (await store.submit(text, selectedLibraries.value, mode.value)) draft.value = ''
}
async function createWorkspace() {
  if (!workspaceName.value.trim()) return
  await action('workspace', async () => {
    const workspace = await agentApi.createWorkspace(workspaceName.value.trim())
    store.workspaces.push(workspace)
    workspaceDialog.value = false
    workspaceName.value = ''
    await store.selectWorkspace(workspace.id)
  })
}
async function decide(card: Approval, decision: string) {
  await action(card.id, () => store.decide(card, decision))
}
function usePrompt(text: string) {
  draft.value = text
}
function newConversation() {
  store.newConversation()
  tab.value = 'assistant'
}
function openConversation(id: string) {
  tab.value = 'assistant'
  void store.selectConversation(id)
}
function handleEnter(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}
watch(
  () => store.workspaceId,
  () => {
    selectedLibraries.value = []
    preview.value = null
    draft.value = ''
  }
)
watch(
  () => [answer.value, archivedMessages.value.length],
  async () => {
    const element = messageList.value
    const nearBottom =
      !element || element.scrollHeight - element.scrollTop - element.clientHeight < 160
    if (nearBottom) {
      await nextTick()
      messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })
    }
  }
)
onMounted(async () => {
  await store.initialize()
  const { courseId, courseName } = route.query
  if (typeof courseId === 'string' && typeof courseName === 'string' && store.workspaceId && !store.error) {
    // 从课程页进入时仅准备新咨询，发送与业务办理仍由用户确认。
    store.newConversation()
    await nextTick()
    draft.value = `我想了解“${courseName}”（课程编号：${courseId}）的学习要求、学习安排和预约方式。`
    void router.replace({ path: '/agent' })
  }
})
onBeforeUnmount(() => store.disconnect())
</script>

<template>
  <NConfigProvider
    :theme="isDark ? darkTheme : null"
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="{
      common: {
        primaryColor: '#397366',
        primaryColorHover: '#4b897b',
        primaryColorPressed: '#2b5b50',
        borderRadius: '8px',
      },
    }"
  >
    <main class="agent-workspace" :class="{ 'workspace-dark': isDark }">
      <aside class="workspace-sidebar">
        <div class="workspace-brand">
          <span class="brand-mark"><SparklesIcon /></span>
          <div><strong>Agent 工作台</strong><small>知识与业务办理</small></div>
        </div>
        <label class="sidebar-label">工作空间</label>
        <div class="workspace-picker">
          <NSelect
            :value="store.workspaceId || null"
            :options="workspaceOptions"
            :disabled="store.sending"
            aria-label="工作空间"
            placeholder="加载工作空间"
            @update:value="store.selectWorkspace"
          /><NButton quaternary circle aria-label="创建工作空间" @click="workspaceDialog = true"
            ><PlusIcon class="small-icon"
          /></NButton>
        </div>
        <div class="workspace-navigation">
          <button :class="{ current: tab === 'assistant' }" @click="tab = 'assistant'">
            <ChatBubbleLeftRightIcon /><span>智能助理</span>
          </button>
          <button :class="{ current: tab === 'knowledge' }" @click="tab = 'knowledge'">
            <DocumentTextIcon /><span>知识库</span><small>{{ store.knowledgeBases.length }}</small>
          </button>
          <button :class="{ current: tab === 'trials' }" @click="tab = 'trials'">
            <ClockIcon /><span>免费试听</span>
          </button>
          <button :class="{ current: tab === 'evaluations' }" @click="tab = 'evaluations'">
            <ChartBarIcon /><span>评测与用量</span>
          </button>
        </div>
        <div class="conversation-heading">
          <span class="sidebar-label">最近会话</span
          ><button
            aria-label="新建会话"
            :disabled="store.sending"
            @click="newConversation"
          >
            <PlusIcon class="small-icon" />
          </button>
        </div>
        <div class="conversation-list">
          <p v-if="!store.conversations.length" class="sidebar-empty">
            每次探索，都从一个问题开始。
          </p>
          <button
            v-for="item in store.conversations"
            :key="item.id"
            :title="item.title"
            :disabled="store.sending"
            :class="{ selected: store.conversation?.id === item.id }"
            @click="openConversation(item.id)"
          >
            <ChatBubbleLeftRightIcon /><span>{{ item.title }}</span>
          </button>
        </div>
        <div class="sidebar-footer">
          <span class="online-dot"></span>
          <div>百炼 qwen3.7-flash<small>文档向量 · text-embedding-v4</small></div>
        </div>
      </aside>

      <div class="workspace-body">
        <header class="workspace-header">
          <div>
            <span class="breadcrumb">{{
              store.workspaces.find((item) => item.id === store.workspaceId)?.name || '工作空间'
            }}</span
            ><span class="breadcrumb-divider">/</span
            ><strong>{{
              tab === 'knowledge' ? '知识库' : tab === 'trials' ? '免费试听' : tab === 'evaluations' ? '评测与用量' : '智能助理'
            }}</strong>
          </div>
          <span class="header-note">让知识成为行动</span>
        </header>
        <NAlert
          v-if="store.error"
          type="error"
          closable
          class="workspace-error"
          @close="store.error = ''"
          >{{ store.error
          }}<NButton
            size="small"
            style="margin-left: 12px"
            @click="store.run ? store.connect() : store.initialize()"
            >重新连接</NButton
          ></NAlert
        >
        <KnowledgePanel v-if="tab === 'knowledge'" />
        <TrialCampaignPanel
          v-else-if="tab === 'trials'"
          :workspace-id="store.workspaceId"
          :role="store.workspaces.find((item) => item.id === store.workspaceId)?.role || ''"
        />
        <EvaluationPanel v-else-if="tab === 'evaluations'" />
        <div v-else class="assistant-layout">
          <section class="conversation-area">
            <div class="conversation-top">
              <div>
                <h2>{{ store.conversation?.title || '新的会话' }}</h2>
                <p>提问、查证，并在您确认后办理业务。</p>
              </div>
              <NButton size="small" :disabled="store.sending" @click="store.newConversation()"
                >＋ 新会话</NButton
              >
            </div>
            <div ref="messageList" class="conversation-messages" aria-live="polite">
              <NSpin :show="store.busy">
                <div v-if="!archivedMessages.length && !store.run" class="assistant-welcome">
                  <div class="welcome-mark"><SparklesIcon /></div>
                  <p class="eyebrow">YOUR KNOWLEDGE, IN ACTION</p>
                  <h1>今天，有什么可以帮您？</h1>
                  <p>从文档里寻找答案，比较课程方案，<br />或把一个想法变成可确认的行动。</p>
                  <div class="starter-prompts">
                    <button
                      @click="usePrompt('请介绍目前有哪些课程，并帮我比较适合初学者的选项。')"
                    >
                      <span>了解课程</span><small>查询与比较适合您的学习方案 ↗</small></button
                    ><button @click="usePrompt('请根据知识库资料回答，并注明相关文档与页码。')">
                      <span>查阅资料</span><small>从知识库中找答案与原始依据 ↗</small></button
                    ><button @click="usePrompt('我想预约试听课程，请先帮我查询可选课程和校区。')">
                      <span>预约试听</span><small>核对信息后，再确认办理 ↗</small>
                    </button>
                  </div>
                </div>
                <article
                  v-for="message in archivedMessages"
                  :key="message.id"
                  class="agent-message"
                  :class="message.role === 'user' ? 'from-user' : 'from-assistant'"
                >
                  <div class="message-author">
                    <span>{{ message.role === 'user' ? '您' : 'Agent' }}</span
                    ><time>{{
                      new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }}</time>
                  </div>
                  <p v-if="message.role === 'user'" class="user-text">{{ message.content }}</p>
                  <div v-else class="agent-markdown" v-html="renderMarkdown(message.content)" />
                  <div v-if="message.citations?.length" class="citation-list">
                    <button
                      v-for="(citation, index) in message.citations"
                      :key="index"
                      @click="preview = citation"
                    >
                      <DocumentTextIcon />{{ citation.title || '引用文档' }} · 第
                      {{ citation.page }} 页 ↗
                    </button>
                  </div>
                </article>
                <article v-if="pendingUserInput" class="agent-message from-user">
                  <div class="message-author"><span>您</span></div>
                  <p class="user-text">{{ pendingUserInput }}</p>
                </article>
                <article v-if="answer && !hasArchivedAnswer" class="agent-message from-assistant">
                  <div class="message-author">
                    <span>Agent</span
                    ><NTag v-if="store.active" size="small" :bordered="false" type="info">{{
                      statusLabel(store.run!.status)
                    }}</NTag>
                  </div>
                  <div class="agent-markdown" v-html="renderMarkdown(answer)" />
                  <div class="citation-list">
                    <button
                      v-for="(citation, index) in store.run?.citations || []"
                      :key="index"
                      @click="preview = citation"
                    >
                      <DocumentTextIcon />{{ citation.title || '引用文档' }} · 第
                      {{ citation.page }} 页 ↗
                    </button>
                  </div>
                </article>
                <NAlert
                  v-if="store.run?.execution === null && store.run.submission"
                  type="info"
                  title="已提交，执行状态尚未确认"
                >
                  <p>{{ store.run.submission.message }}</p>
                  <p v-if="store.run.submission.cancellationRequested">取消请求已保存，等待执行器确认。</p>
                  <p v-if="store.run.submission.lastError">{{ store.run.submission.lastError }}</p>
                </NAlert>
                <div v-else-if="store.active && !answer" class="working-indicator">
                  <span class="online-dot"></span
                  >{{
                    store.run?.status === 'WAITING_APPROVAL'
                      ? '请核对下方草稿并确认'
                      : store.run?.status === 'WAITING_INPUT'
                        ? '请补充必要信息后继续'
                        : 'Agent 正在执行任务，可在右侧查看进度…'
                  }}
                </div>
                <article v-for="card in approvalCards" :key="card.id" class="approval-card">
                  <div class="approval-heading">
                    <span class="approval-icon">
                      <ClockIcon v-if="card.toolName === 'claim_trial'" class="small-icon" />
                      <template v-else>✓</template>
                    </span>
                    <div>
                      <h3>{{ card.toolName === 'claim_trial' ? '免费试听抢课申请' : '试听预约草稿' }}</h3>
                      <p>{{ card.toolName === 'claim_trial' ? '请核对活动、课程、校区和开抢时间。' : '请核对课程、校区与联系方式。' }}</p>
                    </div>
                    <NTag :type="card.status === 'PENDING' ? 'warning' : 'default'" size="small">{{
                      card.toolName === 'claim_trial' && card.status === 'EXECUTED' ? '已提交申请' : statusLabel(card.status)
                    }}</NTag>
                  </div>
                  <dl>
                    <template v-for="(value, key) in card.args" :key="key"
                      ><dt>{{ approvalField(String(key)) }}</dt>
                      <dd>{{ approvalValue(String(key), value) }}</dd></template
                    >
                  </dl>
                  <NAlert v-if="card.toolName === 'claim_trial'" type="info" :show-icon="false">
                    草稿不预占名额，批准后才提交申请，以最终订单结果为准。停止 Agent 不会撤销已受理的申请。
                  </NAlert>
                  <p class="muted">
                    有效期至 {{ new Date(card.expiresAt).toLocaleString('zh-CN') }}
                  </p>
                  <div v-if="card.status === 'PENDING' && store.active" class="approval-actions">
                    <NButton :disabled="Boolean(actionBusy)" @click="decide(card, 'REJECTED')"
                      >拒绝</NButton
                    ><NButton
                      type="primary"
                      :loading="actionBusy === card.id"
                      :disabled="Boolean(actionBusy)"
                      @click="decide(card, 'APPROVED')"
                      >{{ card.toolName === 'claim_trial' ? '确认提交免费抢课' : '确认并办理预约' }}</NButton
                    >
                  </div>
                  <NAlert
                    v-if="card.toolName === 'claim_trial' && card.trialResult"
                    class="trial-result"
                    :type="trialConfirmed(card.trialResult) ? 'success' : card.trialResult.status === 'REJECTED' ? 'warning' : 'info'"
                    :title="trialResultLabel(card.trialResult)"
                  >
                    <p v-if="trialConfirmed(card.trialResult)">订单编号：{{ card.trialResult.orderId }}</p>
                    <p v-if="card.trialResult.requestId">申请编号：{{ card.trialResult.requestId }}</p>
                    <p>动作编号：{{ card.actionId }}</p>
                    <p v-if="card.trialResult.reason">原因：{{ card.trialResult.reason }}</p>
                    <NButton
                      v-if="!trialConfirmed(card.trialResult) && card.trialResult.status !== 'REJECTED'"
                      size="small"
                      :disabled="store.active || store.sending"
                      title="将查询请求填入输入框，发送后查询最新结果"
                      @click="usePrompt(`查询免费试听申请结果，动作编号：${card.actionId}`)"
                    >继续查询结果</NButton>
                  </NAlert>
                  <div v-else-if="card.result && card.toolName !== 'claim_trial'" class="approval-result">
                    <CheckCircleIcon class="small-icon" />办理结果：{{
                      card.result.reservationId || card.result.status || '已提交'
                    }}
                  </div>
                </article>
                <NAlert v-if="store.run?.error" type="error" class="run-error">{{
                  typeof store.run.error === 'string' ? store.run.error : store.run.error.message
                }}</NAlert>
              </NSpin>
            </div>
            <form class="agent-composer" @submit.prevent="send">
              <div class="composer-options">
                <NRadioGroup v-model:value="mode" size="small" :disabled="store.active"
                  ><NRadioButton value="agent">Agent</NRadioButton
                  ><NRadioButton value="chat">对话</NRadioButton></NRadioGroup
                ><NSelect
                  v-model:value="selectedLibraries"
                  multiple
                  clearable
                  :options="libraryOptions"
                  placeholder="添加知识库"
                  aria-label="对话知识库"
                  size="small"
                  :disabled="store.active"
                  max-tag-count="responsive"
                  style="max-width: 300px"
                />
              </div>
              <textarea
                v-model="draft"
                :disabled="store.sending"
                aria-label="输入消息"
                :placeholder="
                  store.run?.status === 'WAITING_INPUT'
                    ? '补充信息，让任务继续…'
                    : '输入您的问题或任务…'
                "
                rows="2"
                @keydown="handleEnter"
              />
              <div class="composer-footer">
                <span>Enter 发送 · Shift + Enter 换行</span
                ><NButton
                  v-if="store.active && store.run?.status !== 'WAITING_INPUT'"
                  :loading="actionBusy === 'cancel'"
                  @click="action('cancel', store.cancel)"
                  ><StopIcon class="small-icon" />停止任务</NButton
                ><NButton
                  v-else
                  type="primary"
                  attr-type="submit"
                  :disabled="!canSubmit"
                  :loading="store.sending"
                  ><ArrowUpIcon class="small-icon" />{{
                    store.run?.status === 'WAITING_INPUT' ? '补充并继续' : '发送'
                  }}</NButton
                >
              </div>
            </form>
            <p class="composer-note">业务操作需要您的明确确认。引用信息可点击查看原文。</p>
          </section>

          <aside class="run-panel">
            <div class="run-panel-heading">
              <h3>执行轨迹</h3>
              <NTag
                v-if="store.run"
                :type="
                  store.run.status === 'SUCCEEDED'
                    ? 'success'
                    : store.run.status === 'FAILED'
                      ? 'error'
                      : 'info'
                "
                size="small"
                :bordered="false"
                >{{ statusLabel(store.run.status) }}</NTag
              >
            </div>
            <p class="muted">实时查看步骤、工具与执行结果。</p>
            <NSelect
              v-if="runOptions.length > 1"
              :value="store.run?.runId"
              :options="runOptions"
              size="small"
              aria-label="选择运行"
              style="margin-top: 12px"
              @update:value="(id) => action('run', () => store.selectRun(id))"
            />
            <div v-if="!store.run" class="trace-empty">
              <ClockIcon />
              <p>任务开始后，<br />执行过程会显示在这里。</p>
            </div>
            <template v-else
              ><div class="connection-status">
                <span
                  :class="[
                    'online-dot',
                    { disconnected: !['实时连接', '事件已同步'].includes(store.connection) },
                  ]"
                ></span
                ><span>{{ store.connection }}</span
                ><button
                  title="重新连接事件流"
                  aria-label="重新连接事件流"
                  @click="store.connect()"
                >
                  <ArrowPathIcon class="small-icon" />
                </button>
              </div>
              <p class="run-identifier" :title="store.run.runId">
                运行 {{ store.run.runId.slice(0, 12) }} · 已同步 {{ store.cursor }} 个事件
              </p>
              <ol class="event-timeline">
                <li v-for="event in visibleEvents" :key="event.seq">
                  <span class="event-dot"></span>
                  <div>
                    <strong>{{ eventLabels[event.type] || event.type }}</strong>
                    <p>{{ eventSummary(event) }}</p>
                    <time>{{ new Date(event.createdAt).toLocaleTimeString('zh-CN') }}</time>
                    <details v-if="event.type === 'tool.completed'">
                      <summary>查看工具结果</summary>
                      <pre>{{ JSON.stringify(event.data.result, null, 2) }}</pre>
                    </details>
                  </div>
                </li>
              </ol>
              <div v-if="store.run.usage" class="run-usage">
                <span
                  >Tokens <strong>{{ store.run.usage.totalTokens ?? '待统计' }}</strong></span
                ><span
                  >Agent 聊天估算费用
                  <strong>{{
                    store.run.usage.estimatedCostCny == null
                      ? '待统计'
                      : `¥${store.run.usage.estimatedCostCny.toFixed(4)}`
                  }}</strong></span
                >
              </div>
              <NButton
                v-if="['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(store.run.status)"
                block
                :loading="actionBusy === 'retry'"
                @click="action('retry', store.retry)"
                >重新运行</NButton
              ></template
            >
          </aside>
        </div>
      </div>
      <NModal
        v-model:show="workspaceDialog"
        preset="card"
        title="创建工作空间"
        style="width: min(440px, 90vw)"
        ><NInput
          v-model:value="workspaceName"
          placeholder="例如：学习与课程"
          aria-label="工作空间名称"
          maxlength="80"
          @keyup.enter="createWorkspace"
        /><template #footer
          ><NButton
            type="primary"
            :disabled="!workspaceName.trim()"
            :loading="actionBusy === 'workspace'"
            @click="createWorkspace"
            >创建</NButton
          ></template
        ></NModal
      >
      <DocumentPreview
        v-if="preview"
        :document-id="preview.documentId"
        :workspace-id="store.workspaceId"
        :title="preview.title || '引用文档'"
        :page="preview.page"
        @close="preview = null"
      />
    </main>
  </NConfigProvider>
</template>
