<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { NAlert, NButton, NEmpty, NInput, NModal, NSelect, NSpin, NTag } from 'naive-ui'
import { agentApi, ApiError } from './api'
import {
  errorMessage,
  type TrialCampaign,
  type TrialCatalog,
  type TrialClaimResult,
  type TrialReconciliation,
} from './types'

const props = defineProps<{ workspaceId: string; role: string }>()
const isOwner = computed(() => props.role === 'OWNER')
const campaigns = ref<TrialCampaign[]>([])
const myClaims = ref<TrialClaimResult[]>([])
const selectedId = ref('')
const detail = ref<TrialCampaign | null>(null)
const catalog = ref<TrialCatalog | null>(null)
const catalogError = ref('')
const formError = ref('')
const loading = ref(false)
const detailLoading = ref(false)
const claimLoading = ref(false)
const busy = ref('')
const error = ref('')
const notice = ref('')
const createOpen = ref(false)
const pauseOpen = ref(false)
const resultLookup = ref('')
const claim = ref<TrialClaimResult | null>(null)
const reconciliation = ref<TrialReconciliation | null>(null)
const form = reactive({
  title: '',
  courseId: null as string | null,
  schoolId: null as string | null,
  capacity: 8,
  startsAt: '',
  endsAt: '',
})
type SavedClaim = { clientRequestId: string; requestId?: string }
const savedClaims = ref<Record<string, SavedClaim>>({})
let storageKey = ''
let generation = 0
let pollingTimer: ReturnType<typeof setTimeout> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let pollCount = 0

const selected = computed(() =>
  detail.value?.id === selectedId.value
    ? detail.value
    : campaigns.value.find((item) => item.id === selectedId.value) || null
)
const courseOptions = computed(() =>
  (catalog.value?.courses || []).map((item) => ({ label: item.name + ' · #' + item.id, value: String(item.id) }))
)
const campusOptions = computed(() =>
  (catalog.value?.campuses || []).map((item) => ({
    label: item.name + (item.city ? ' · ' + item.city : '') + ' · #' + item.id,
    value: String(item.id),
  }))
)
const saved = computed(() => selectedId.value ? savedClaims.value[selectedId.value] : undefined)
const now = ref(Date.now())
const canClaim = computed(() => {
  const campaign = selected.value
  if (!campaign || saved.value?.requestId) return false
  // 原请求的回执可能丢失；重试必须继续使用原键，即使活动窗口已关闭。
  if (saved.value?.clientRequestId) return true
  if (campaign.status !== 'LIVE') return false
  const time = now.value
  return time >= Date.parse(campaign.startsAt) && time < Date.parse(campaign.endsAt)
})
const claimProgress = computed(() => {
  if (!claim.value) return ''
  if (claim.value.status === 'SUCCEEDED' && claim.value.orderId) return '名额已确认，0 元试听订单已创建'
  if (claim.value.status === 'REJECTED') return '本次未获得免费试听名额'
  if (claim.value.status === 'RESERVED') return '名额已预留，正在创建订单'
  return '请求已受理，正在确认名额'
})
const claimType = computed(() =>
  claim.value?.status === 'SUCCEEDED' && claim.value.orderId
    ? 'success'
    : claim.value?.status === 'REJECTED'
      ? 'error'
      : 'info'
)
const claimStatusName = (value: TrialClaimResult) => {
  if (value.status === 'SUCCEEDED' && value.orderId) return '已确认订单'
  if (value.status === 'REJECTED') return '未获名额'
  if (value.status === 'RESERVED') return '已预留'
  return '处理中'
}
const statusName = (status: string) =>
  ({ DRAFT: '草稿', LIVE: '已发布', PAUSED: '已暂停' })[status] || status
const dateText = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
const isTerminal = (value: TrialClaimResult | null) =>
  value?.status === 'REJECTED' || (value?.status === 'SUCCEEDED' && Boolean(value.orderId))

function stopPolling() {
  if (pollingTimer) clearTimeout(pollingTimer)
  pollingTimer = undefined
}
function readSavedClaims(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    if (value && typeof value === 'object' && !Array.isArray(value))
      return value as Record<string, SavedClaim>
  } catch {
    // 本地回执损坏时仍可通过请求编号查询服务器结果。
  }
  return {}
}
async function receiptStorageKey(workspaceId: string) {
  try {
    const token = localStorage.getItem('zhikexing_token')
    if (!token) return ''
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `zhikexing_trial_receipts:${fingerprint}:${workspaceId}`
  } catch {
    return ''
  }
}
function saveClaim(campaignId: string, entry: SavedClaim) {
  savedClaims.value = { ...savedClaims.value, [campaignId]: entry }
  try {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(savedClaims.value))
  } catch {
    // 浏览器存储不可用也不能阻止服务器接受同一个请求编号。
  }
}
function upsertClaim(value: TrialClaimResult) {
  const index = myClaims.value.findIndex((item) => item.requestId === value.requestId)
  if (index >= 0) myClaims.value[index] = { ...myClaims.value[index], ...value }
  else myClaims.value.unshift(value)
}
function updateCampaign(value: TrialCampaign) {
  const index = campaigns.value.findIndex((item) => item.id === value.id)
  if (index >= 0) campaigns.value[index] = value
  else campaigns.value.unshift(value)
  if (selectedId.value === value.id) detail.value = value
}
async function load() {
  const current = ++generation
  stopPolling()
  pollCount = 0
  busy.value = ''
  claimLoading.value = false
  detailLoading.value = false
  loading.value = false
  campaigns.value = []
  myClaims.value = []
  selectedId.value = ''
  detail.value = null
  claim.value = null
  resultLookup.value = ''
  reconciliation.value = null
  catalog.value = null
  catalogError.value = ''
  createOpen.value = false
  pauseOpen.value = false
  formError.value = ''
  Object.assign(form, { title: '', courseId: null, schoolId: null, capacity: 8, startsAt: '', endsAt: '' })
  savedClaims.value = {}
  storageKey = ''
  error.value = ''
  notice.value = ''
  if (!props.workspaceId) return
  const workspaceId = props.workspaceId
  loading.value = true
  try {
    const [items, records, receiptKey] = await Promise.all([
      agentApi.trialCampaigns(workspaceId),
      agentApi.trialClaims(workspaceId),
      receiptStorageKey(workspaceId),
    ])
    if (current !== generation) return
    campaigns.value = items
    myClaims.value = records
    storageKey = receiptKey
    savedClaims.value = storageKey ? readSavedClaims(storageKey) : {}
    for (const record of records) {
      savedClaims.value[record.campaignId] = {
        clientRequestId: savedClaims.value[record.campaignId]?.clientRequestId || crypto.randomUUID(),
        requestId: record.requestId,
      }
    }
    if (items.length) await selectCampaign(items[0].id)
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    if (current === generation) loading.value = false
  }
  if (current === generation && isOwner.value) await loadCatalog(workspaceId, current)
}
async function loadCatalog(workspaceId = props.workspaceId, current = generation) {
  catalogError.value = ''
  try {
    const value = await agentApi.trialCatalog(workspaceId)
    if (current === generation) catalog.value = value
  } catch (failure) {
    if (current === generation) catalogError.value = errorMessage(failure)
  }
}
async function refreshList() {
  if (!props.workspaceId) return
  const current = generation
  loading.value = true
  error.value = ''
  try {
    const [items, records] = await Promise.all([
      agentApi.trialCampaigns(props.workspaceId),
      agentApi.trialClaims(props.workspaceId),
    ])
    if (current !== generation) return
    campaigns.value = items
    myClaims.value = records
    for (const record of records)
      saveClaim(record.campaignId, {
        clientRequestId: savedClaims.value[record.campaignId]?.clientRequestId || crypto.randomUUID(),
        requestId: record.requestId,
      })
    if (selectedId.value && !items.some((item) => item.id === selectedId.value)) {
      selectedId.value = ''
      detail.value = null
    }
    if (selectedId.value) await selectCampaign(selectedId.value)
    else if (items.length) await selectCampaign(items[0].id)
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    if (current === generation) loading.value = false
  }
}
async function selectCampaign(id: string) {
  if (!props.workspaceId) return
  stopPolling()
  pollCount = 0
  selectedId.value = id
  detail.value = null
  claim.value = null
  reconciliation.value = null
  error.value = ''
  notice.value = ''
  const current = generation
  const workspaceId = props.workspaceId
  detailLoading.value = true
  try {
    const value = await agentApi.trialCampaign(workspaceId, id)
    if (current !== generation || selectedId.value !== id) return
    updateCampaign(value)
    const known = myClaims.value.find((item) => item.campaignId === id)
    if (known) {
      claim.value = known
      resultLookup.value = known.requestId
      if (!isTerminal(known)) schedulePoll(known.requestId, id)
    } else {
      const requestId = savedClaims.value[id]?.requestId
      if (requestId) await refreshClaim(requestId, id)
    }
  } catch (failure) {
    if (current === generation && selectedId.value === id) error.value = errorMessage(failure)
  } finally {
    if (current === generation && selectedId.value === id) detailLoading.value = false
  }
}
function schedulePoll(requestId: string, campaignId: string) {
  stopPolling()
  if (isTerminal(claim.value) || pollCount >= 15) return
  pollingTimer = setTimeout(() => {
    pollCount++
    void refreshClaim(requestId, campaignId)
  }, 2000)
}
async function refreshClaim(requestId = saved.value?.requestId, campaignId = selectedId.value) {
  if (!requestId || claimLoading.value || !props.workspaceId) return
  const current = generation
  const workspaceId = props.workspaceId
  claimLoading.value = true
  stopPolling()
  try {
    const value = await agentApi.trialClaim(workspaceId, requestId.trim())
    if (current !== generation || selectedId.value !== campaignId) return
    if (value.campaignId !== campaignId) {
      error.value = '该请求属于其他活动，请先选择对应活动'
      return
    }
    claim.value = value
    upsertClaim(value)
    resultLookup.value = value.requestId
    saveClaim(campaignId, {
      clientRequestId: savedClaims.value[campaignId]?.clientRequestId || crypto.randomUUID(),
      requestId: value.requestId,
    })
    error.value = ''
    if (!isTerminal(value)) schedulePoll(value.requestId, campaignId)
  } catch (failure) {
    if (current === generation && selectedId.value === campaignId) error.value = errorMessage(failure)
  } finally {
    if (current === generation) claimLoading.value = false
  }
}
async function lookupClaim() {
  const requestId = resultLookup.value.trim()
  if (!requestId || !props.workspaceId) return
  const current = generation
  claimLoading.value = true
  error.value = ''
  stopPolling()
  try {
    const value = await agentApi.trialClaim(props.workspaceId, requestId)
    if (current !== generation) return
    if (selectedId.value !== value.campaignId) {
      selectedId.value = value.campaignId
      detail.value = null
      reconciliation.value = null
      const campaign = await agentApi.trialCampaign(props.workspaceId, value.campaignId)
      if (current !== generation) return
      updateCampaign(campaign)
    }
    claim.value = value
    upsertClaim(value)
    saveClaim(value.campaignId, {
      clientRequestId: savedClaims.value[value.campaignId]?.clientRequestId || crypto.randomUUID(),
      requestId: value.requestId,
    })
    if (!isTerminal(value)) schedulePoll(value.requestId, value.campaignId)
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    if (current === generation) claimLoading.value = false
  }
}
async function submitClaim() {
  const campaign = selected.value
  if (!campaign || !canClaim.value || busy.value || !props.workspaceId) return
  const workspaceId = props.workspaceId
  const current = generation
  const campaignId = campaign.id
  const clientRequestId = savedClaims.value[campaignId]?.clientRequestId || crypto.randomUUID()
  // 发送前落盘；网络断开导致回执丢失时，重试复用同一幂等键。
  saveClaim(campaignId, { clientRequestId })
  busy.value = 'claim'
  error.value = ''
  notice.value = ''
  try {
    const value = await agentApi.submitTrialClaim(workspaceId, campaignId, clientRequestId)
    if (current !== generation || selectedId.value !== campaignId) return
    if (!value.requestId || value.campaignId !== campaignId)
      throw new Error('受理回执缺少有效请求编号，请使用原请求编号重试')
    saveClaim(campaignId, { clientRequestId, requestId: value.requestId })
    claim.value = value
    upsertClaim(value)
    resultLookup.value = value.requestId
    notice.value = '抢课请求已受理；最终以结果查询中的订单编号为准。'
    if (!isTerminal(value)) schedulePoll(value.requestId, campaignId)
  } catch (failure) {
    if (current === generation) {
      if (failure instanceof ApiError && failure.status === 409) {
        try {
          const records = await agentApi.trialClaims(workspaceId)
          if (current !== generation || selectedId.value !== campaignId) return
          myClaims.value = records
          const existing = records.find((item) => item.campaignId === campaignId)
          if (existing) {
            saveClaim(campaignId, { clientRequestId, requestId: existing.requestId })
            claim.value = existing
            resultLookup.value = existing.requestId
            notice.value = '已找到您此前的参与记录，请查看原申请结果。'
            if (!isTerminal(existing)) schedulePoll(existing.requestId, campaignId)
            return
          }
        } catch {
          // 保留原来的业务错误，用户仍可刷新记录或输入请求编号。
        }
      }
      error.value = `${errorMessage(failure)}。若网络中断导致结果不明，请使用原请求编号重试。`
    }
  } finally {
    if (current === generation) busy.value = ''
  }
}
function parseDateTime(value: string) {
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? '' : time.toISOString()
}
function openCreate() {
  formError.value = ''
  createOpen.value = true
}
async function createCampaign() {
  if (!isOwner.value || busy.value || !props.workspaceId) return
  const title = form.title.trim()
  const startsAt = parseDateTime(form.startsAt)
  const endsAt = parseDateTime(form.endsAt)
  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  if (!title || !form.courseId || !form.schoolId || !Number.isInteger(form.capacity)
      || form.capacity < 1 || form.capacity > 10000 || !startsAt || !endsAt
      || end <= start || end <= Date.now() || end - start > 30 * 86400_000) {
    formError.value = '请填写名称、课程和校区；名额为 1～10000，结束时间须晚于开始和当前时间，活动窗口不超过 30 天。'
    return
  }
  const current = generation
  busy.value = 'create'
  formError.value = ''
  try {
    const value = await agentApi.createTrialCampaign(props.workspaceId, {
      title,
      courseId: form.courseId,
      schoolId: form.schoolId,
      capacity: form.capacity,
      startsAt,
      endsAt,
    })
    if (current !== generation) return
    updateCampaign(value)
    selectedId.value = value.id
    detail.value = value
    claim.value = null
    reconciliation.value = null
    createOpen.value = false
    notice.value = '活动草稿已创建。核对窗口和名额后再发布。'
    Object.assign(form, { title: '', courseId: null, schoolId: null, capacity: 8, startsAt: '', endsAt: '' })
  } catch (failure) {
    if (current === generation) formError.value = errorMessage(failure)
  } finally {
    if (current === generation) busy.value = ''
  }
}
async function changeStatus(action: 'publish' | 'pause') {
  if (!isOwner.value || !selected.value || busy.value) return
  const current = generation
  const campaignId = selected.value.id
  busy.value = action
  error.value = ''
  try {
    const value = action === 'publish'
      ? await agentApi.publishTrialCampaign(props.workspaceId, campaignId)
      : await agentApi.pauseTrialCampaign(props.workspaceId, campaignId)
    if (current !== generation || selectedId.value !== campaignId) return
    updateCampaign(value)
    reconciliation.value = null
    notice.value = action === 'publish' ? '活动已发布，请等待开抢时间。' : '活动已暂停；已受理的请求仍会继续处理。'
    pauseOpen.value = false
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    if (current === generation) busy.value = ''
  }
}
async function loadReconciliation() {
  if (!isOwner.value || !selected.value || busy.value) return
  const current = generation
  const campaignId = selected.value.id
  busy.value = 'reconcile'
  error.value = ''
  try {
    const value = await agentApi.trialReconciliation(props.workspaceId, campaignId)
    if (current === generation && selectedId.value === campaignId) reconciliation.value = value
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    if (current === generation) busy.value = ''
  }
}
watch(() => [props.workspaceId, props.role], () => void load(), { immediate: true })
onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => {
  generation++
  stopPolling()
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <section class="trial-panel panel-content">
    <div class="section-heading">
      <div>
        <p class="trial-eyebrow">FREE TRIAL</p>
        <h2>免费试听抢课</h2>
        <p class="muted">查看活动、直接申请名额，并以订单结果确认是否抢课成功。</p>
      </div>
      <div class="trial-heading-actions">
        <NButton :loading="loading" :disabled="!workspaceId" @click="refreshList">刷新活动</NButton>
        <NButton v-if="isOwner" type="primary" :disabled="!workspaceId" @click="openCreate">创建活动</NButton>
      </div>
    </div>
    <NAlert v-if="error" type="error" closable class="trial-message" @close="error = ''">{{ error }}</NAlert>
    <NAlert v-if="notice" type="success" closable class="trial-message" @close="notice = ''">{{ notice }}</NAlert>
    <NSpin :show="loading">
      <NEmpty v-if="!workspaceId" description="请选择工作空间" />
      <NEmpty v-else-if="!campaigns.length && !loading" description="当前没有试听活动" />
      <div v-else class="trial-layout">
        <div class="trial-list" aria-label="试听活动列表">
          <button
            v-for="item in campaigns"
            :key="item.id"
            class="trial-list-item"
            :class="{ selected: item.id === selectedId }"
            @click="selectCampaign(item.id)"
          >
            <span class="trial-list-title">{{ item.title }}</span>
            <span class="trial-list-meta">{{ item.courseName }} · {{ item.schoolName }}</span>
            <span class="trial-list-footer">
              <NTag size="small" :type="item.status === 'LIVE' ? 'success' : item.status === 'PAUSED' ? 'warning' : 'default'">
                {{ statusName(item.status) }}
              </NTag>
              <span>{{ dateText(item.startsAt) }}</span>
            </span>
          </button>
        </div>
        <div class="trial-detail">
          <NSpin :show="detailLoading">
            <div v-if="selected" class="trial-detail-card">
              <div class="trial-detail-header">
                <div>
                  <p class="trial-eyebrow">活动详情</p>
                  <h3>{{ selected.title }}</h3>
                </div>
                <NTag :type="selected.status === 'LIVE' ? 'success' : selected.status === 'PAUSED' ? 'warning' : 'default'">
                  {{ statusName(selected.status) }}
                </NTag>
              </div>
              <dl class="trial-facts">
                <dt>课程</dt><dd>{{ selected.courseName }}</dd>
                <dt>校区</dt><dd>{{ selected.schoolName }}</dd>
                <dt>开抢时间</dt><dd>{{ dateText(selected.startsAt) }}</dd>
                <dt>结束时间</dt><dd>{{ dateText(selected.endsAt) }}</dd>
                <dt>试听费用</dt><dd>0 元</dd>
                <dt>活动名额</dt><dd>{{ selected.capacity }} 个</dd>
                <dt>数据库未确认名额</dt><dd>{{ selected.remaining }} 个</dd>
              </dl>
              <p class="trial-caveat">{{ selected.remainingMeaning || '该数字不代表实时可抢名额；申请是否成功以订单结果为准。' }}</p>

              <div class="trial-action-block">
                <h4>直接抢课</h4>
                <p class="muted">每人每场活动只能参与一次；请求受理、名额预留和订单成功是不同阶段。</p>
                <div class="trial-inline-actions">
                  <NButton
                    type="primary"
                    :loading="busy === 'claim'"
                    :disabled="!canClaim || Boolean(busy)"
                    @click="submitClaim"
                  >{{ saved?.clientRequestId && !saved.requestId ? '按原请求重试' : '立即抢课' }}</NButton>
                  <NButton
                    v-if="saved?.requestId"
                    :loading="claimLoading"
                    @click="refreshClaim()"
                  >查询结果</NButton>
                </div>
                <p v-if="saved?.clientRequestId && !saved.requestId" class="muted">原请求结果尚不明确；按原请求重试仅用于恢复回执，不会额外创建一次参与。</p>
                <p v-else-if="selected.status === 'DRAFT'" class="muted">活动尚未发布。</p>
                <p v-else-if="selected.status === 'PAUSED'" class="muted">活动已暂停新申请。</p>
                <p v-else-if="now < Date.parse(selected.startsAt)" class="muted">尚未到开抢时间。</p>
                <p v-else-if="now >= Date.parse(selected.endsAt)" class="muted">活动已结束。</p>
                <p v-else-if="saved?.requestId" class="muted">本活动已有申请回执，请查询原请求。</p>
                <NAlert v-if="claim" :type="claimType" class="trial-result" :title="claimProgress">
                  <p>申请编号：{{ claim.requestId }}</p>
                  <p v-if="claim.status === 'SUCCEEDED' && claim.orderId">订单编号：{{ claim.orderId }}</p>
                  <p v-if="claim.reason">原因：{{ claim.reason }}</p>
                  <p v-if="!isTerminal(claim)" class="muted">页面会短暂自动查询；之后可手动刷新。请勿因为等待而再次创建申请。</p>
                </NAlert>
              </div>

              <div v-if="isOwner" class="trial-action-block">
                <h4>活动管理</h4>
                <div class="trial-inline-actions">
                  <NButton v-if="selected.status === 'DRAFT'" type="primary" :loading="busy === 'publish'" :disabled="Boolean(busy)" @click="changeStatus('publish')">发布活动</NButton>
                  <NButton v-if="selected.status === 'LIVE'" type="warning" :disabled="Boolean(busy)" @click="pauseOpen = true">暂停活动</NButton>
                  <NButton :loading="busy === 'reconcile'" :disabled="Boolean(busy)" @click="loadReconciliation">查看对账</NButton>
                </div>
                <div v-if="reconciliation" class="trial-reconciliation">
                  <strong>只读对账快照</strong>
                  <dl class="trial-facts">
                    <dt>容量 / 数据库剩余</dt><dd>{{ reconciliation.capacity }} / {{ reconciliation.remaining }}</dd>
                    <dt>已确认订单</dt><dd>{{ reconciliation.confirmedOrders }}</dd>
                    <dt>待处理 / 已预留</dt><dd>{{ reconciliation.pending }} / {{ reconciliation.reserved }}</dd>
                    <dt>待补偿</dt><dd>{{ reconciliation.releasePending }}</dd>
                    <dt>数据库守恒</dt><dd>{{ reconciliation.databaseInvariantHolds ? '通过' : '异常，请排查' }}</dd>
                    <dt>Redis 状态 / 余量</dt><dd>{{ reconciliation.redis?.state || reconciliation.redis?.status || '未知' }} / {{ reconciliation.redis?.remaining ?? '未知' }}</dd>
                  </dl>
                  <p class="trial-caveat">{{ reconciliation.note }}</p>
                </div>
              </div>
            </div>
          </NSpin>
        </div>
      </div>
    </NSpin>
    <div v-if="workspaceId" class="trial-history">
      <div class="trial-history-heading">
        <div>
          <h3>我的参与记录</h3>
          <p class="muted">显示当前账号最近 100 条申请，包括直接抢课和 Agent 审批申请。</p>
        </div>
        <span class="muted">{{ myClaims.length }} 条</span>
      </div>
      <NEmpty v-if="!myClaims.length" description="还没有参与记录" />
      <div v-else class="trial-history-list">
        <button v-for="record in myClaims" :key="record.requestId" class="trial-history-item" @click="selectCampaign(record.campaignId)">
          <span>
            <strong>{{ record.campaignTitle || campaigns.find((item) => item.id === record.campaignId)?.title || '试听活动' }}</strong>
            <small>{{ record.source === 'AGENT' ? 'Agent 审批' : '直接抢课' }} · {{ record.createdAt ? dateText(record.createdAt) : record.requestId }}</small>
          </span>
          <NTag size="small" :type="record.status === 'REJECTED' ? 'error' : record.status === 'SUCCEEDED' && record.orderId ? 'success' : 'info'">
            {{ claimStatusName(record) }}
          </NTag>
        </button>
      </div>
    </div>
    <div v-if="workspaceId" class="trial-lookup">
      <div>
        <h3>查询我的抢课结果</h3>
        <p class="muted">输入此前保存的申请编号，只能查询当前账号自己的申请。</p>
      </div>
      <div class="trial-lookup-input">
        <NInput v-model:value="resultLookup" placeholder="申请编号 requestId" clearable @keyup.enter="lookupClaim" />
        <NButton :loading="claimLoading" :disabled="!resultLookup.trim()" @click="lookupClaim">查询</NButton>
      </div>
    </div>

    <NModal v-model:show="createOpen" preset="card" title="创建免费试听活动" class="trial-modal">
      <form class="trial-create-form" @submit.prevent="createCampaign">
        <NAlert v-if="formError" type="error" closable @close="formError = ''">{{ formError }}</NAlert>
        <label>活动名称 <NInput v-model:value="form.title" maxlength="120" placeholder="例如：AI Agent 工程实战免费试听" /></label>
        <label>课程
          <NSelect v-model:value="form.courseId" :options="courseOptions" filterable placeholder="选择已有课程" :disabled="!catalog" />
        </label>
        <label>校区
          <NSelect v-model:value="form.schoolId" :options="campusOptions" filterable placeholder="选择已有校区" :disabled="!catalog" />
        </label>
        <NAlert v-if="catalogError" type="error">课程与校区目录加载失败：{{ catalogError }}。请重试后创建活动。</NAlert>
        <NAlert v-else-if="catalog && (!catalog.courses.length || !catalog.campuses.length)" type="warning">
          当前缺少可选课程或校区，请先准备业务基础数据。
        </NAlert>
        <NButton v-if="catalogError" size="small" @click="loadCatalog()">重新加载目录</NButton>
        <label>试听名额 <input v-model.number="form.capacity" type="number" min="1" max="10000" step="1" required /></label>
        <label>开始时间 <input v-model="form.startsAt" type="datetime-local" required /></label>
        <label>结束时间 <input v-model="form.endsAt" type="datetime-local" required /></label>
        <p class="muted">活动窗口最长 30 天。创建后为草稿，核对信息再发布；发布后不可编辑。</p>
        <div class="trial-modal-actions">
          <NButton @click="createOpen = false">取消</NButton>
          <NButton type="primary" attr-type="submit" :loading="busy === 'create'" :disabled="!catalog?.courses.length || !catalog?.campuses.length || Boolean(busy)">创建草稿</NButton>
        </div>
      </form>
    </NModal>
    <NModal v-model:show="pauseOpen" preset="dialog" title="暂停活动" positive-text="确认暂停" negative-text="取消"
      @positive-click="changeStatus('pause')">
      暂停后不再接收新申请，已受理请求仍会继续处理；暂停后无法恢复该活动。
    </NModal>
  </section>
</template>

<style scoped>
.trial-panel { max-width: 1380px; width: 100%; margin: 0 auto; }
.trial-eyebrow { color: var(--accent); font-size: 10px; letter-spacing: 1.6px; font-weight: 700; margin-bottom: 8px; }
.trial-heading-actions, .trial-inline-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.trial-message { margin: 0 0 18px; }
.trial-layout { display: grid; grid-template-columns: minmax(230px, 310px) minmax(0, 1fr); gap: 18px; align-items: start; }
.trial-list { display: grid; gap: 9px; max-height: 70vh; overflow-y: auto; }
.trial-list-item { display: grid; gap: 7px; text-align: left; padding: 15px; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; color: var(--ink); cursor: pointer; }
.trial-list-item.selected { border-color: var(--accent); background: var(--soft); }
.trial-list-title { font-size: 14px; font-weight: 650; }
.trial-list-meta, .trial-list-footer { color: var(--muted); font-size: 11px; }
.trial-list-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.trial-detail-card, .trial-lookup { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 23px; }
.trial-detail-header { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
.trial-detail-header h3 { font-size: 20px; }
.trial-facts { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 11px 18px; margin: 23px 0 12px; font-size: 12px; }
.trial-facts dt { color: var(--muted); }
.trial-facts dd { overflow-wrap: anywhere; }
.trial-caveat { color: var(--muted); font-size: 11px; line-height: 1.7; }
.trial-action-block { border-top: 1px solid var(--line); margin-top: 23px; padding-top: 22px; }
.trial-action-block h4 { font-size: 15px; margin-bottom: 7px; }
.trial-inline-actions { margin: 13px 0; }
.trial-result { margin-top: 16px; overflow-wrap: anywhere; }
.trial-result p + p { margin-top: 7px; }
.trial-reconciliation { margin-top: 17px; padding: 16px; background: var(--soft); border-radius: 9px; }
.trial-reconciliation .trial-facts { margin: 16px 0; }
.trial-lookup { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-top: 20px; }
.trial-history { margin-top: 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 23px; }
.trial-history-heading { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 14px; }
.trial-history-heading h3 { font-size: 15px; }
.trial-history-list { display: grid; gap: 8px; max-height: 350px; overflow-y: auto; }
.trial-history-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 13px; background: var(--soft); border: 1px solid var(--line); border-radius: 8px; text-align: left; color: var(--ink); cursor: pointer; }
.trial-history-item strong { display: block; font-size: 12px; }
.trial-history-item small { display: block; color: var(--muted); font-size: 10px; margin-top: 5px; overflow-wrap: anywhere; }
.trial-lookup h3 { font-size: 15px; }
.trial-lookup-input { display: flex; gap: 9px; min-width: min(450px, 100%); }
.trial-create-form { display: grid; gap: 16px; }
.trial-create-form label { display: grid; gap: 7px; font-size: 12px; }
.trial-create-form input[type='number'], .trial-create-form input[type='datetime-local'] { min-height: 35px; padding: 6px 9px; background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 7px; }
.trial-modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 8px; }
@media (max-width: 980px) { .trial-layout { grid-template-columns: 1fr; } .trial-list { display: flex; overflow-x: auto; max-height: none; } .trial-list-item { min-width: 210px; } }
@media (max-width: 720px) { .trial-lookup { flex-direction: column; align-items: stretch; } .trial-lookup-input { min-width: 0; } .trial-facts { grid-template-columns: 115px minmax(0, 1fr); } .trial-detail-card, .trial-lookup, .trial-history { padding: 17px; } }
</style>
