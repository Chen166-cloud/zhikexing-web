<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { NModal, NSpin, NAlert, NTabs, NTabPane, NEmpty } from 'naive-ui'
import { agentApi, apiUrl, authorizedFetch } from './api'
import { errorMessage, type DocumentChunk } from './types'

const props = defineProps<{
  documentId: string
  workspaceId: string
  title: string
  page?: number
}>()
const emit = defineEmits<{ close: [] }>()
const url = ref('')
const chunks = ref<DocumentChunk[]>([])
const loading = ref(false)
const error = ref('')
let generation = 0
function release() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
}
watch(
  () => [props.documentId, props.workspaceId],
  async () => {
    const current = ++generation
    release()
    chunks.value = []
    if (!props.documentId) return
    loading.value = true
    error.value = ''
    try {
      const [response, pages] = await Promise.all([
        authorizedFetch(
          apiUrl(`/documents/${props.documentId}/content`, { workspaceId: props.workspaceId })
        ),
        agentApi.chunks(props.documentId, props.workspaceId),
      ])
      const blob = await response.blob()
      if (current !== generation) return
      url.value = URL.createObjectURL(blob)
      chunks.value = pages
    } catch (failure) {
      if (current === generation) error.value = errorMessage(failure)
    } finally {
      if (current === generation) loading.value = false
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  generation++
  release()
})
</script>

<template>
  <NModal
    :show="Boolean(documentId)"
    preset="card"
    :title="title || '文档预览'"
    class="document-preview"
    style="width: min(1100px, 95vw)"
    @update:show="!$event && emit('close')"
  >
    <NSpin :show="loading">
      <NAlert v-if="error" type="error">{{ error }}</NAlert>
      <NTabs type="line" animated>
        <NTabPane name="file" tab="原始 PDF">
          <iframe
            v-if="url"
            :src="`${url}#page=${page || 1}`"
            title="文档原文"
            style="width: 100%; height: 70vh; border: 0"
          />
        </NTabPane>
        <NTabPane name="chunks" tab="提取内容">
          <div style="max-height: 70vh; overflow: auto">
            <NEmpty v-if="!chunks.length" description="文档尚未生成可检索内容" />
            <article
              v-for="chunk in chunks"
              :key="chunk.id"
              style="padding: 16px 0; border-bottom: 1px solid #e5e7eb"
            >
              <strong>第 {{ chunk.page }} 页</strong>
              <p style="white-space: pre-wrap; margin-top: 8px">{{ chunk.content }}</p>
            </article>
          </div>
        </NTabPane>
      </NTabs>
    </NSpin>
  </NModal>
</template>
