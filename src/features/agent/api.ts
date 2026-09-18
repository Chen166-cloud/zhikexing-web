import type {
  Approval,
  Conversation,
  DocumentChunk,
  Evaluation,
  EvaluationCase,
  KnowledgeBase,
  KnowledgeDocument,
  Metrics,
  Run,
  Workspace,
} from './types'

const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message)
  }
}
export function apiUrl(path: string, query: Record<string, string | number> = {}) {
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  )
  return `${base}/api/v1${path}${params.size ? `?${params}` : ''}`
}
export async function authorizedFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  const token = localStorage.getItem('iiip_token')
  if (token) headers.set('Authorization', token)
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('iiip_token')
      window.dispatchEvent(new CustomEvent('auth-changed'))
    }
    const text = await response.text()
    let message = `请求失败（${response.status}）`
    let code = 'HTTP_ERROR'
    try {
      const error = JSON.parse(text)
      message = error.message || error.msg || message
      code = error.code || code
    } catch {
      /* 代理返回的非 JSON 错误保留 HTTP 状态。 */
    }
    throw new ApiError(message, response.status, code)
  }
  return response
}
async function request<T>(
  path: string,
  query: Record<string, string | number> = {},
  method = 'GET',
  body?: unknown
): Promise<T> {
  const multipart = body instanceof FormData
  const response = await authorizedFetch(apiUrl(path, query), {
    method,
    headers: body && !multipart ? { 'Content-Type': 'application/json' } : {},
    body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
  })
  return response.status === 204 ? (undefined as T) : response.json()
}
export const agentApi = {
  workspaces: () => request<Workspace[]>('/workspaces'),
  createWorkspace: (name: string) => request<Workspace>('/workspaces', {}, 'POST', { name }),
  conversations: (workspaceId: string) =>
    request<Conversation[]>('/conversations', { workspaceId }),
  conversation: (id: string, workspaceId: string) =>
    request<Conversation>(`/conversations/${id}`, { workspaceId }),
  createConversation: (workspaceId: string, title: string) =>
    request<Conversation>('/conversations', {}, 'POST', { workspaceId, title }),
  runs: (workspaceId: string) => request<Run[]>('/runs', { workspaceId }),
  run: (id: string, workspaceId: string) => request<Run>(`/runs/${id}`, { workspaceId }),
  createRun: (body: {
    workspaceId: string
    conversationId: string
    clientRequestId: string
    input: string
    knowledgeBaseIds: string[]
    mode: string
  }) => request<Run>('/runs', {}, 'POST', body),
  cancel: (id: string, workspaceId: string) =>
    request<Run>(`/runs/${id}/cancel`, {}, 'POST', { workspaceId }),
  retry: (id: string, workspaceId: string) =>
    request<Run>(`/runs/${id}/retry`, {}, 'POST', { workspaceId }),
  input: (id: string, workspaceId: string, input: string, clientRequestId: string) =>
    request<Run>(`/runs/${id}/inputs`, {}, 'POST', { workspaceId, input, clientRequestId }),
  approvals: (workspaceId: string, runId?: string) =>
    request<Approval[]>('/approvals', runId ? { workspaceId, runId } : { workspaceId }),
  decide: (id: string, workspaceId: string, decision: string, expectedVersion: number) =>
    request<Approval>(`/approvals/${id}/decision`, {}, 'POST', {
      workspaceId,
      decision,
      expectedVersion,
    }),
  knowledgeBases: (workspaceId: string) =>
    request<KnowledgeBase[]>('/knowledge-bases', { workspaceId }),
  createKnowledgeBase: (workspaceId: string, name: string) =>
    request<KnowledgeBase>('/knowledge-bases', {}, 'POST', { workspaceId, name }),
  documents: (workspaceId: string, knowledgeBaseId: string) =>
    request<KnowledgeDocument[]>('/documents', { workspaceId, knowledgeBaseId }),
  upload: (body: FormData) => request<KnowledgeDocument>('/documents', {}, 'POST', body),
  deleteDocument: (id: string, workspaceId: string) =>
    request<void>(`/documents/${id}`, { workspaceId }, 'DELETE'),
  retryDocument: (id: string, workspaceId: string) =>
    request<KnowledgeDocument>(`/documents/${id}/retry`, {}, 'POST', { workspaceId }),
  chunks: (id: string, workspaceId: string) =>
    request<DocumentChunk[]>(`/documents/${id}/chunks`, { workspaceId }),
  evaluations: (workspaceId: string) => request<Evaluation[]>('/evaluations', { workspaceId }),
  evaluation: (id: string, workspaceId: string) =>
    request<Evaluation>(`/evaluations/${id}`, { workspaceId }),
  evaluate: (workspaceId: string, knowledgeBaseId: string, cases: EvaluationCase[]) =>
    request<Evaluation>('/evaluations', {}, 'POST', { workspaceId, knowledgeBaseId, cases }),
  metrics: (workspaceId: string) => request<Metrics>('/metrics', { workspaceId }),
}
