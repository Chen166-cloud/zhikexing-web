<template>
  <div class="home" :class="{ dark: isDark }">
    <div class="container">
      <h1 class="title">大模型综合交互平台</h1>
      <div class="cards-grid">
        <router-link
          v-for="app in aiApps"
          :key="app.id"
          :to="app.route"
          class="card"
        >
          <div class="card-content">
            <component :is="app.icon" class="icon" />
            <h2>{{ app.title }}</h2>
            <p>{{ app.description }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDark } from '@vueuse/core'
import {
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'

const isDark = useDark()

const aiApps = ref([
  {
    id: 1,
    title: 'AI 聊天',
    description: '自然语言对话',
    route: '/ai-chat',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    id: 2,
    title: '今天怎么过',
    description: '用选择推进一天的生活模拟',
    route: '/game',
    icon: CalendarDaysIcon,
  },
  {
    id: 3,
    title: '智能客服',
    description: '课程咨询与试听预约助手',
    route: '/customer-service',
    icon: UserGroupIcon,
  },
  {
    id: 4,
    title: 'ChatPDF',
    description: '上传 PDF 并围绕文档问答',
    route: '/chat-pdf',
    icon: DocumentTextIcon,
  },
])
</script>

<style scoped lang="scss">
.home {
  min-height: calc(100vh - 64px);
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(0, 124, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom right, rgba(0, 173, 181, 0.1), transparent 28%),
    var(--bg-color);
  transition: background-color 0.3s;

  .container {
    max-width: 1500px;
    margin: 0 auto;
    padding: 2rem;
  }

  .title {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 2.5rem;
    color: var(--text-color);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1.5rem;
    justify-items: center;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (min-width: 1200px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .card {
    width: 100%;
    max-width: 320px;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.75rem;
    text-decoration: none;
    color: inherit;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
      transform: translateY(-4px);
      border-color: rgba(0, 124, 240, 0.45);
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
  }

  .icon {
    width: 48px;
    height: 48px;
    color: #007cf0;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
  }

  p {
    min-height: 3rem;
    color: #5b6472;
    line-height: 1.5;
  }
}

.dark {
  .card {
    background: rgba(36, 40, 48, 0.92);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
  }

  p {
    color: #aab3c2;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 1rem;

    .container {
      padding: 1rem 0;
    }

    .title {
      font-size: 2rem;
    }

    .card {
      max-width: 100%;
    }
  }
}
</style>
