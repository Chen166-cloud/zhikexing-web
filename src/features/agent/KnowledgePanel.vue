<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { NButton, NInput, NSelect, NAlert, NEmpty, NTag, NPopconfirm, NSpin } from 'naive-ui'
import { useAgentStore } from '../../stores/agent'
import { agentApi } from './api'
import { errorMessage, statusLabel, type KnowledgeDocument } from './types'
import DocumentPreview from './DocumentPreview.vue'

const store = useAgentStore()
const selected = ref('')
const name = ref('')
const documents = ref<KnowledgeDocument[]>([])
const busy = ref(false)
const loading = ref(false)
const error = ref('')
const uploadName = ref('')
const input = ref<HTMLInputElement | null>(null)
const preview = ref<KnowledgeDocument | null>(null)
const options = computed(() =>
  store.knowledgeBases.map((item) => ({ label: item.name, value: item.id }))
)
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function refresh() {
  const current = generation
  clearTimeout(timer)
  if (!selected.value || !store.workspaceId) return
  try {
    const result = await agentApi.documents(store.workspaceId, selected.value)
    if (current !== generation) return
    documents.value = result
    if (result.some((item) => !['READY', 'FAILED', 'DELETED'].includes(item.status)))
      timer = setTimeout(refresh, 2000)
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  }
}
watch(
  () => store.workspaceId,
  () => {
    generation++
    selected.value = ''
    documents.value = []
    preview.value = null
    error.value = ''
    clearTimeout(timer)
  }
)
watch(
  options,
  (items) => {
    if (!items.some((item) => item.value === selected.value)) selected.value = items[0]?.value || ''
  },
  { immediate: true }
)
watch(
  selected,
  async () => {
    generation++
    documents.value = []
    error.value = ''
    loading.value = true
    await refresh()
    loading.value = false
  },
  { immediate: true }
)
async function create() {
  if (!name.value.trim()) return
  busy.value = true
  error.value = ''
  const workspace = store.workspaceId
  try {
    const library = await agentApi.createKnowledgeBase(workspace, name.value.trim())
    if (workspace !== store.workspaceId) return
    store.knowledgeBases.push(library)
    selected.value = library.id
    name.value = ''
  } catch (failure) {
    error.value = errorMessage(failure)
  } finally {
    busy.value = false
  }
}
async function upload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  error.value = ''
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    error.value = '请选择 PDF 文件'
    target.value = ''
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    error.value = 'PDF 文件不能超过 50 MB'
    target.value = ''
    return
  }
  busy.value = true
  uploadName.value = file.name
  const current = generation
  try {
    const form = new FormData()
    form.append('workspaceId', store.workspaceId)
    form.append('knowledgeBaseId', selected.value)
    form.append('file', file)
    await agentApi.upload(form)
    if (current === generation) await refresh()
  } catch (failure) {
    if (current === generation) error.value = errorMessage(failure)
  } finally {
    busy.value = false
    uploadName.value = ''
    target.value = ''
  }
}
async function operate(document: KnowledgeDocument, action: 'delete' | 'retry') {
  busy.value = true
  error.value = ''
  const current = generation
  try {
    if (action === 'delete') await agentApi.deleteDocument(document.id, store.workspaceId)
    else await agentApi.retryDocument(document.id, store.workspaceId)
    if (current === generation) await refresh()
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
        <p class="eyebrow">KNOWLEDGE</p>
        <h2>知识库</h2>
        <p class="muted">集中管理资料，让每次回答都有可追溯的依据。</p>
      </div>
    </div>
    <NAlert v-if="error" type="error" closable @close="error = ''">{{ error }}</NAlert>
    <div class="library-toolbar">
      <NSelect
        v-model:value="selected"
        :options="options"
        placeholder="选择知识库"
        aria-label="知识库"
        style="max-width: 300px"
      />
      <NInput
        v-model:value="name"
        placeholder="新知识库名称"
        aria-label="新知识库名称"
        maxlength="80"
        style="max-width: 240px"
        @keyup.enter="create"
      />
      <NButton
        :loading="busy && !uploadName"
        :disabled="!name.trim() || !store.workspaceId"
        @click="create"
        >创建知识库</NButton
      >
    </div>
    <div class="upload-zone">
      <div class="upload-symbol">↥</div>
      <h3>上传您的 PDF 资料</h3>
      <p class="muted">上传后自动解析与建立索引，完成后即可用于 Agent 问答。单个文件最大 50 MB。</p>
      <input ref="input" type="file" accept="application/pdf,.pdf" hidden @change="upload" />
      <NButton
        type="primary"
        :disabled="!selected || busy"
        :loading="Boolean(uploadName)"
        @click="input?.click()"
        >{{ uploadName ? `正在上传 ${uploadName}` : '选择 PDF 文件' }}</NButton
      >
    </div>
    <div class="section-heading">
      <h3>文档 · {{ documents.length }}</h3>
      <NButton size="small" @click="refresh">刷新状态</NButton>
    </div>
    <NSpin :show="loading">
      <NEmpty v-if="!documents.length" description="还没有文档，上传第一份资料开始使用" />
      <div class="document-list">
        <article v-for="document in documents" :key="document.id" class="document-row">
          <div class="file-symbol">PDF</div>
          <div class="document-info">
            <strong>{{ document.title }}</strong>
            <p class="muted">版本 {{ document.version }} · {{ document.chunkCount || 0 }} 个片段</p>
            <p v-if="document.error" class="error-text">{{ document.error }}</p>
          </div>
          <NTag
            :type="
              document.status === 'READY'
                ? 'success'
                : document.status === 'FAILED'
                  ? 'error'
                  : 'info'
            "
            size="small"
            :bordered="false"
            >{{ statusLabel(document.status) }}</NTag
          >
          <NButton size="small" @click="preview = document">预览</NButton>
          <NButton
            v-if="document.status === 'FAILED'"
            size="small"
            :disabled="busy"
            @click="operate(document, 'retry')"
            >重试</NButton
          >
          <NPopconfirm @positive-click="operate(document, 'delete')"
            ><template #trigger
              ><NButton size="small" quaternary type="error" :disabled="busy"
                >删除</NButton
              ></template
            >删除「{{ document.title }}」及其检索内容？</NPopconfirm
          >
        </article>
      </div>
    </NSpin>
    <DocumentPreview
      v-if="preview"
      :document-id="preview.id"
      :title="preview.title"
      :workspace-id="store.workspaceId"
      @close="preview = null"
    />
  </section>
</template>
