export interface Workspace {
  id: string
  name: string
  role: string
}
export interface Citation {
  evidenceId?: string
  documentId: string
  title?: string
  page: number
  content?: string
  chunkId?: string
}
export interface Message {
  id: string
  role: string
  content: string
  runId?: string
  createdAt: string
  citations?: Citation[]
}
export interface Conversation {
  id: string
  title: string
  workspaceId: string
  createdAt: string
  messages?: Message[]
}
export interface Usage {
  model?: string
  totalTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  estimatedCostCny?: number | null
}
export interface Run {
  runId: string
  conversationId: string
  workspaceId: string
  status: string
  input: string
  answer?: string
  error?: string | { code: string; message: string }
  usage?: Usage
  steps?: number
  citations?: Citation[]
  createdAt: string
  updatedAt?: string
  execution?: unknown | null
  submission?: {
    status: 'PENDING' | 'IN_FLIGHT' | 'DELIVERED'
    attempts: number
    lastError?: string | null
    nextAttemptAt?: string | null
    leaseExpiresAt?: string | null
    message: string
    cancellationRequested?: boolean
  }
}
export interface RunEvent {
  runId: string
  seq: number
  type: string
  data: Record<string, unknown>
  createdAt: string
}
export interface Approval {
  id: string
  runId: string
  actionId: string
  status: string
  version: number
  args: Record<string, unknown>
  expiresAt: string
  result?: Record<string, unknown>
}
export interface KnowledgeBase {
  id: string
  name: string
  workspaceId: string
}
export interface KnowledgeDocument {
  id: string
  title: string
  status: string
  version: number
  chunkCount: number
  error?: string
  createdAt: string
}
export interface DocumentChunk {
  id: string
  page: number
  content: string
}
export interface EvaluationCase {
  question: string
  expectedText?: string
  expectedDocumentId?: string
}
export interface EvaluationResult extends EvaluationCase {
  answer?: string
  passed?: boolean | null
  error?: string
  citations?: Citation[]
  latencyMs?: number
  runId?: string
  retrievalHit?: boolean
  textMatch?: boolean
}
export interface Evaluation {
  id: string
  status: string
  createdAt: string
  results?: EvaluationResult[]
  total?: number
  passed?: number
  passRate?: number
  metrics?: Record<string, number>
  summary?: {
    total: number
    scored?: number
    passed: number
    passRate: number | null
    averageLatencyMs: number
  }
}
export interface Metrics {
  runCount: number
  successRate: number
  totalTokens: number
  estimatedCostCny: number | null
  knownCostCny?: number
  unknownUsageRuns?: number
  averageLatencyMs: number
  statusCounts: Record<string, number>
}

export const terminalStatuses = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'])
export const statusLabels: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '执行中',
  WAITING_INPUT: '等待补充',
  WAITING_APPROVAL: '等待确认',
  SUCCEEDED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
  TIMED_OUT: '已超时',
  PENDING: '待确认',
  APPROVED: '已同意',
  REJECTED: '已拒绝',
  EXPIRED: '已过期',
  EXECUTED: '已办理',
  UPLOADED: '等待解析',
  PROCESSING: '处理中',
  PARSING: '解析中',
  EMBEDDING: '生成向量',
  INDEXING: '建立索引',
  READY: '可检索',
  DELETED: '已删除',
}
export const statusLabel = (status: string) => statusLabels[status] || status
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '请求失败，请重试'
