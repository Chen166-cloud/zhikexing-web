<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog-card">
          <div class="dialog-header">
            <ExclamationTriangleIcon class="warn-icon" />
            <h3>{{ title }}</h3>
          </div>
          <p class="dialog-message">{{ message }}</p>
          <div class="dialog-actions">
            <button class="btn-cancel" @click="handleCancel">{{ cancelText }}</button>
            <button class="btn-confirm" @click="handleConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认删除' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' }
})

const emit = defineEmits(['confirm', 'cancel'])

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-card {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease-out;

  .dialog-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;

    .warn-icon {
      width: 1.75rem;
      height: 1.75rem;
      color: #f59e0b;
      flex-shrink: 0;
    }

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a1a1a;
    }
  }

  .dialog-message {
    font-size: 0.9375rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    padding-left: 2.5rem;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;

    button {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #374151;

      &:hover {
        background: #e5e7eb;
      }
    }

    .btn-confirm {
      background: #ef4444;
      color: #fff;

      &:hover {
        background: #dc2626;
      }
    }
  }
}

// 过渡动画
.dialog-enter-active {
  transition: opacity 0.2s ease;

  .dialog-card {
    animation: slideIn 0.2s ease-out;
  }
}

.dialog-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
