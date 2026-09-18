import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentApi, apiUrl, authorizedFetch, ApiError } from '../features/agent/api'
import { consumeEvents } from '../features/agent/sse'
import {
  errorMessage,
  terminalStatuses,
  type Approval,
  type Conversation,
  type KnowledgeBase,
  type Run,
  type RunEvent,
  type Workspace,
} from '../features/agent/types'

export const useAgentStore = defineStore('agent', () => {
  const workspaces = ref<Workspace[]>([])
  const workspaceId = ref('')
  const conversations = ref<Conversation[]>([])
  const conversation = ref<Conversation | null>(null)
  const knowledgeBases = ref<KnowledgeBase[]>([])
  const runs = ref<Run[]>([])
  const run = ref<Run | null>(null)
  const events = ref<RunEvent[]>([])
  const approvals = ref<Approval[]>([])
  const liveAnswer = ref('')
  const connection = ref('未连接')
  const error = ref('')
  const busy = ref(false)
  const sending = ref(false)
  const cursor = ref(0)
  const active = computed(() => Boolean(run.value && !terminalStatuses.has(run.value.status)))
  let stream: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let runSelection = 0
  let reconnectAttempt = 0
  let pendingSubmission: { key: string; signature: string } | null = null

  function disconnect() {
    stream?.abort()
    stream = null
    clearTimeout(reconnectTimer)
    connection.value = '未连接'
  }

  function clearRun() {
    runSelection++
    disconnect()
    run.value = null
    events.value = []
    approvals.value = []
    liveAnswer.value = ''
    cursor.value = 0
  }

  async function initialize() {
    busy.value = true
    error.value = ''
    try {
      workspaces.value = await agentApi.workspaces()
      // 只保存选择，不把历史消息、联系人或 Token 写进工作台缓存。
      const saved = localStorage.getItem('iiip_workspace')
      const selected = workspaces.value.find((item) => item.id === saved) || workspaces.value[0]
      if (selected) await selectWorkspace(selected.id)
    } catch (failure) {
      error.value = errorMessage(failure)
    } finally {
      busy.value = false
    }
  }

  async function selectWorkspace(id: string) {
    const current = ++generation
    clearRun()
    workspaceId.value = id
    localStorage.setItem('iiip_workspace', id)
    conversation.value = null
    conversations.value = []
    runs.value = []
    knowledgeBases.value = []
    error.value = ''
    busy.value = true
    try {
      const [items, libraries, history] = await Promise.all([
        agentApi.conversations(id),
        agentApi.knowledgeBases(id),
        agentApi.runs(id),
      ])
      if (current !== generation) return
      conversations.value = items
      knowledgeBases.value = libraries
      runs.value = history
      if (items[0]) await selectConversation(items[0].id)
    } catch (failure) {
      if (current === generation) error.value = errorMessage(failure)
    } finally {
      if (workspaceId.value === id) busy.value = false
    }
  }

  async function selectConversation(id: string) {
    const current = ++generation
    clearRun()
    conversation.value = null
    busy.value = true
    error.value = ''
    try {
      const detail = await agentApi.conversation(id, workspaceId.value)
      if (current !== generation) return
      conversation.value = detail
      const latest = runs.value
        .filter((item) => item.conversationId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
      if (latest) await selectRun(latest.runId)
    } catch (failure) {
      if (current === generation) error.value = errorMessage(failure)
    } finally {
      if (current === generation) busy.value = false
    }
  }

  function newConversation() {
    generation++
    clearRun()
    conversation.value = null
    error.value = ''
    busy.value = false
  }

  async function refreshRun(id: string, expectedGeneration: number) {
    const workspace = workspaceId.value
    const [detail, cards] = await Promise.all([
      agentApi.run(id, workspace),
      agentApi.approvals(workspace, id),
    ])
    if (expectedGeneration !== generation || id !== run.value?.runId) return
    run.value = detail
    approvals.value = cards
    const index = runs.value.findIndex((item) => item.runId === id)
    if (index === -1) runs.value.unshift(detail)
    else runs.value[index] = detail
    if (terminalStatuses.has(detail.status) && conversation.value?.id === detail.conversationId) {
      const archived = await agentApi.conversation(detail.conversationId, workspace)
      if (expectedGeneration === generation && id === run.value?.runId)
        conversation.value = archived
    }
  }

  async function selectRun(id: string) {
    const current = generation
    clearRun()
    const selection = runSelection
    const detail = await agentApi.run(id, workspaceId.value)
    if (current !== generation || selection !== runSelection) return
    run.value = detail
    const cards = await agentApi.approvals(workspaceId.value, id)
    if (current !== generation || selection !== runSelection) return
    approvals.value = cards
    reconnectAttempt = 0
    void connect()
  }

  function receive(event: RunEvent) {
    // 同一个运行只消费递增序号，旧会话及重放的重复事件不会串入当前消息。
    if (event.runId !== run.value?.runId || event.seq <= cursor.value) return
    cursor.value = event.seq
    events.value.push(event)
    const data = event.data
    if (event.type === 'message.reset') liveAnswer.value = ''
    if (event.type === 'message.delta') liveAnswer.value += String(data.content || '')
    if (event.type === 'message.completed') {
      liveAnswer.value = String(data.content || '')
      run.value.citations = data.citations as Run['citations']
    }
    if (event.type === 'run.started') run.value.status = 'RUNNING'
    if (event.type === 'input.required') run.value.status = 'WAITING_INPUT'
    if (event.type === 'approval.required') {
      run.value.status = 'WAITING_APPROVAL'
      const card = data as unknown as Approval
      if (!approvals.value.some((item) => item.id === card.id)) approvals.value.push(card)
    }
    if (event.type === 'usage.updated') run.value.usage = data
    if (event.type === 'run.completed') {
      run.value.status = String(data.status || 'SUCCEEDED')
      if (data.answer) liveAnswer.value = String(data.answer)
    }
    if (event.type === 'run.failed') {
      run.value.status = 'FAILED'
      run.value.error = String(data.message || data.error || '任务执行失败')
    }
    if (event.type === 'run.cancelled') run.value.status = 'CANCELLED'
    if (event.type.startsWith('approval.') || event.type.startsWith('run.')) {
      void refreshRun(event.runId, generation).catch((failure) => {
        if (event.runId === run.value?.runId) error.value = errorMessage(failure)
      })
    }
  }

  async function connect() {
    disconnect()
    if (!run.value) return
    const id = run.value.runId
    const current = generation
    const controller = new AbortController()
    stream = controller
    connection.value = cursor.value ? '重连中' : '连接中'
    try {
      // Java 已受理但执行器尚未建立运行时，先轮询回执，避免把事件接口的 404 当作失败。
      if (run.value.execution === null && run.value.submission) {
        await refreshRun(id, current)
        if (controller.signal.aborted || current !== generation || id !== run.value?.runId) return
        if (run.value.execution === null && run.value.submission) {
          connection.value = active.value ? '等待执行确认' : '状态已同步'
          if (active.value) reconnectTimer = setTimeout(() => void connect(), 2000)
          return
        }
      }
      const response = await authorizedFetch(
        apiUrl(`/runs/${id}/events`, { workspaceId: workspaceId.value, after: cursor.value }),
        {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream', 'Last-Event-ID': String(cursor.value) },
        }
      )
      if (!response.body) throw new Error('事件流为空')
      connection.value = '实时连接'
      await consumeEvents(response.body, (event) => {
        if (current === generation && !controller.signal.aborted) {
          reconnectAttempt = 0
          receive(event)
        }
      })
      if (!controller.signal.aborted && current === generation && id === run.value?.runId) {
        await refreshRun(id, current)
        connection.value = active.value ? '连接已断开' : '事件已同步'
      }
    } catch (failure) {
      if (controller.signal.aborted || current !== generation) return
      connection.value = '连接已断开'
      error.value = errorMessage(failure)
      if (failure instanceof ApiError && [401, 403, 404].includes(failure.status)) return
    }
    if (
      !controller.signal.aborted &&
      current === generation &&
      id === run.value?.runId &&
      active.value
    ) {
      reconnectAttempt++
      if (reconnectAttempt <= 5) {
        connection.value = '等待重连'
        reconnectTimer = setTimeout(
          () => void connect(),
          Math.min(1000 * 2 ** reconnectAttempt, 15000)
        )
      }
    }
  }

  async function submit(input: string, knowledgeBaseIds: string[], mode: string) {
    if (!input.trim() || sending.value || !workspaceId.value) return false
    sending.value = true
    error.value = ''
    const current = generation
    const workspace = workspaceId.value
    try {
      if (!conversation.value) {
        const created = await agentApi.createConversation(workspace, input.slice(0, 40))
        if (current !== generation) return false
        conversation.value = created
        conversations.value.unshift(created)
      }
      const conversationId = conversation.value.id
      const signature = JSON.stringify({ workspace, conversationId, input, knowledgeBaseIds, mode })
      // 请求响应丢失时复用同一个幂等键，避免双击或网络重试产生两次任务。
      if (pendingSubmission?.signature !== signature)
        pendingSubmission = { signature, key: crypto.randomUUID() }
      const result =
        run.value?.status === 'WAITING_INPUT'
          ? await agentApi.input(run.value.runId, workspace, input, pendingSubmission.key)
          : await agentApi.createRun({
              workspaceId: workspace,
              conversationId,
              input,
              knowledgeBaseIds,
              mode,
              clientRequestId: pendingSubmission.key,
            })
      pendingSubmission = null
      if (current !== generation) return true
      conversation.value = await agentApi.conversation(conversationId, workspace)
      if (current !== generation) return true
      await selectRun(result.runId)
      return true
    } catch (failure) {
      if (current === generation) error.value = errorMessage(failure)
      return false
    } finally {
      sending.value = false
    }
  }

  async function cancel() {
    if (!run.value) return
    const id = run.value.runId
    const current = generation
    await agentApi.cancel(id, workspaceId.value)
    await refreshRun(id, current)
    if (id === run.value?.runId && !active.value && run.value.execution === null) disconnect()
  }
  async function retry() {
    if (!run.value) return
    const current = generation
    const result = await agentApi.retry(run.value.runId, workspaceId.value)
    if (current === generation) await selectRun(result.runId)
  }
  async function decide(card: Approval, decision: string) {
    const current = generation
    try {
      await agentApi.decide(card.id, workspaceId.value, decision, card.version)
    } finally {
      await refreshRun(card.runId, current)
    }
  }
  return {
    workspaces,
    workspaceId,
    conversations,
    conversation,
    knowledgeBases,
    runs,
    run,
    events,
    approvals,
    liveAnswer,
    connection,
    error,
    busy,
    sending,
    cursor,
    active,
    initialize,
    selectWorkspace,
    selectConversation,
    newConversation,
    selectRun,
    connect,
    disconnect,
    submit,
    cancel,
    retry,
    decide,
  }
})
