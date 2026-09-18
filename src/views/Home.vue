<template>
  <div class="home" :class="{ dark: isDark }">
    <div class="container">
      <div class="home-hero">
        <p class="home-eyebrow">KNOWLEDGE INTO ACTION</p>
        <h1 class="title">让知识，成为行动。</h1>
        <p class="home-intro">一个工作空间，连接文档、对话与业务。<br>让 Agent 查阅依据、提出方案，并在您确认后完成办理。</p>
        <router-link to="/agent" class="workspace-cta">进入 Agent 工作台 <span>↗</span></router-link>
        <div class="hero-capabilities"><span>文档与页码引用</span><span>实时任务轨迹</span><span>审批与执行回执</span></div>
      </div>
      <div class="legacy-heading"><h2>经典应用</h2><span>旧版入口继续保留；新任务推荐使用工作台。</span></div>
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
    max-width: 1220px;
    margin: 0 auto;
    padding: 2rem;
  }

  .home-hero { padding: 40px 0 60px; text-align: center; }
  .home-eyebrow { min-height: 0; color: #668a78; letter-spacing: 3px; font-size: 11px; margin-bottom: 25px; }
  .home-intro { font-size: 15px; line-height: 1.9; margin-top: 20px; }
  .workspace-cta { display: inline-flex; align-items: center; gap: 34px; margin-top: 30px; padding: 13px 25px; border-radius: 10px; background: #397366; color: #fff; font-size: 14px; text-decoration: none; box-shadow: 0 8px 20px #39736620; }
  .workspace-cta:hover { background: #2d6155; }
  .hero-capabilities { display: flex; justify-content: center; gap: 24px; font-size: 11px; color: #839087; margin-top: 26px; }
  .legacy-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
  .legacy-heading h2 { font-size: 16px; }
  .legacy-heading span { font-size: 11px; color: #839087; }

  .title {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0;
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
    min-height: 175px;
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
