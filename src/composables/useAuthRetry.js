import { onUnmounted, ref } from 'vue'

export function useAuthRetry() {
  const retrySeconds = ref(0)
  let timer

  const waitBeforeRetry = (seconds) => {
    clearInterval(timer)
    retrySeconds.value = seconds
    const retryAt = Date.now() + seconds * 1000
    timer = setInterval(() => {
      retrySeconds.value = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
      if (retrySeconds.value === 0) clearInterval(timer)
    }, 1000)
  }

  onUnmounted(() => clearInterval(timer))
  return { retrySeconds, waitBeforeRetry }
}
