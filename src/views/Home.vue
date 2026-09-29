<script setup>
import { useDark } from '@vueuse/core'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  LockClosedIcon,
  SparklesIcon,
  TicketIcon,
} from '@heroicons/vue/24/outline'

const isDark = useDark()

const capabilities = [
  {
    number: '01',
    icon: ChatBubbleLeftRightIcon,
    tone: 'mint',
    category: '课程咨询',
    title: '把问题讲清楚，再做选择',
    description: '在一个对话里梳理课程方向、学习目标与试听需求，获得连贯的咨询体验。',
    detail: '自然语言对话 · 上下文衔接',
  },
  {
    number: '02',
    icon: BookOpenIcon,
    tone: 'blue',
    category: '知识检索',
    title: '每条回答，都有依据可查',
    description: '从课程资料和上传文档中检索相关内容，查看引用与页码，自己判断答案是否可靠。',
    detail: '文档检索 · 来源引用',
  },
  {
    number: '03',
    icon: LockClosedIcon,
    tone: 'gold',
    category: 'Agent 办理',
    title: '重要操作，由你来确认',
    description: 'Agent 可以提出预约与试听申请草稿；提交前展示关键信息，经过人工批准再执行。',
    detail: '人工审批 · 执行回执',
  },
  {
    number: '04',
    icon: TicketIcon,
    tone: 'violet',
    category: '免费试听',
    title: '限量名额，结果清晰可追踪',
    description: '浏览热门课程试听活动，直接申请名额，随时回看申请状态与零元试听订单。',
    detail: '活动浏览 · 库存对账',
  },
]

const steps = [
  {
    number: '01',
    title: '提出你的问题',
    description: '咨询课程、上传资料，或告诉 Agent 你想办理的事情。',
  },
  {
    number: '02',
    title: '查看依据与方案',
    description: '阅读引用来源和行动草稿，核对课程、活动与申请信息。',
  },
  {
    number: '03',
    title: '确认并追踪结果',
    description: '批准后执行办理，在工作台查看进度、回执和试听订单。',
  },
]

const experiments = [
  { label: 'AI 聊天', path: '/ai-chat' },
  { label: '智能客服', path: '/customer-service' },
  { label: 'ChatPDF', path: '/chat-pdf' },
  { label: '互动体验', path: '/game' },
]
</script>

<template>
  <main class="home-page" :class="{ 'home-dark': isDark }">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-glow hero-glow-one"></div>
      <div class="hero-glow hero-glow-two"></div>
      <div class="home-container hero-layout">
        <div class="hero-copy">
          <div class="hero-badge"><span class="badge-dot"></span> 知识驱动的 AI 课程服务平台</div>
          <h1 id="hero-title">从课程问题，<br>走向<span>可信的<br class="narrow-break">下一步。</span></h1>
          <p class="hero-description">
            知课行将课程咨询、知识检索与试听办理连成一条完整路径。
            让 Agent 帮你查阅依据、提出方案；关键决定，始终由你确认。
          </p>
          <div class="hero-actions">
            <router-link to="/agent" class="button button-primary">
              进入 Agent 工作台 <ArrowRightIcon class="button-icon" />
            </router-link>
            <router-link to="/courses" class="button button-ghost">
              浏览课程广场 <ArrowUpRightIcon class="button-icon" />
            </router-link>
          </div>
          <div class="hero-points" aria-label="平台特点">
            <span><CheckCircleIcon /> 回答可追溯</span>
            <span><CheckCircleIcon /> 操作需确认</span>
            <span><CheckCircleIcon /> 结果可回查</span>
          </div>
        </div>

        <div class="hero-visual" aria-label="课程咨询到试听办理的流程示意">
          <div class="visual-orbit orbit-one"></div>
          <div class="visual-orbit orbit-two"></div>
          <div class="visual-shell">
            <div class="visual-topbar">
              <span class="visual-topbar-brand"><span class="mini-mark">知</span> 知课行工作台</span>
              <span class="visual-topbar-status"><i></i> 流程示意</span>
            </div>
            <div class="visual-conversation">
              <div class="visual-label">你的问题</div>
              <div class="question-bubble">我想了解适合入门的 AI 课程，可以先试听吗？</div>
              <div class="assistant-row">
                <span class="assistant-avatar"><SparklesIcon /></span>
                <div class="assistant-answer">
                  <strong>先看课程依据，再决定下一步</strong>
                  <p>已整理课程资料，并找到可申请的免费试听活动。</p>
                </div>
              </div>
              <div class="reference-card">
                <DocumentTextIcon />
                <span><strong>课程资料</strong><small>可查看引用与页码</small></span>
                <ArrowUpRightIcon class="reference-arrow" />
              </div>
              <div class="approval-card">
                <div class="approval-icon"><LockClosedIcon /></div>
                <div>
                  <small>等待你的确认</small>
                  <strong>申请免费试听名额</strong>
                </div>
                <span class="approval-pill">待审批</span>
              </div>
            </div>
            <div class="visual-bottom">
              <span class="flow-line"><i></i><i></i><i></i></span>
              <span>提问 <b>→</b> 引用 <b>→</b> 确认 <b>→</b> 回执</span>
            </div>
          </div>
          <div class="floating-note">
            <span class="floating-icon"><TicketIcon /></span>
            <span><strong>免费试听</strong><small>申请结果随时可查</small></span>
            <CheckCircleIcon class="floating-check" />
          </div>
          <p class="visual-caption">产品能力示意 · 非实时业务数据</p>
        </div>
      </div>
      <div class="hero-bottom-line"></div>
    </section>

    <section id="capabilities" class="capabilities-section home-section">
      <div class="home-container">
        <div class="section-heading">
          <div>
            <p class="section-eyebrow"><span></span> WHAT YOU CAN DO</p>
            <h2>一个工作台，<br>把每一步都照顾到。</h2>
          </div>
          <p class="section-summary">从第一次了解课程，到查阅资料、确认办理和追踪试听结果，所有信息都在同一个地方衔接。</p>
        </div>
        <div class="capability-grid">
          <router-link
            v-for="item in capabilities"
            :key="item.number"
            to="/agent"
            class="capability-card"
            :class="'tone-' + item.tone"
          >
            <div class="card-top">
              <span class="card-icon"><component :is="item.icon" /></span>
              <span class="card-number">{{ item.number }}</span>
            </div>
            <p class="card-category">{{ item.category }}</p>
            <h3>{{ item.title }}</h3>
            <p class="card-description">{{ item.description }}</p>
            <div class="card-footer"><span>{{ item.detail }}</span><ArrowUpRightIcon /></div>
          </router-link>
        </div>
      </div>
    </section>

    <section id="workflow" class="workflow-section home-section">
      <div class="home-container">
        <div class="workflow-heading">
          <p class="section-eyebrow"><span></span> HOW IT WORKS</p>
          <h2>从了解，到行动。<br><em>过程始终清晰。</em></h2>
          <p>Agent 负责整理信息和执行已批准的任务；判断权始终在你手中。</p>
        </div>
        <div class="workflow-steps">
          <div v-for="step in steps" :key="step.number" class="workflow-step">
            <span class="step-number">{{ step.number }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="trial-section">
      <div class="home-container">
        <div class="trial-panel">
          <div class="trial-copy">
            <p class="trial-eyebrow"><TicketIcon /> 免费试听</p>
            <h2>看中的课程，<br>先体验，再决定。</h2>
            <p>浏览热门课程的限量试听活动，直接抢课或请 Agent 协助申请。申请状态与订单结果都可在工作台回查。</p>
            <router-link to="/agent" class="button button-light">查看试听活动 <ArrowRightIcon class="button-icon" /></router-link>
          </div>
          <div class="trial-art" aria-hidden="true">
            <div class="ticket ticket-back"></div>
            <div class="ticket ticket-front">
              <div class="ticket-brand"><span class="mini-mark">知</span> 知课行 <span>TRIAL PASS</span></div>
              <div class="ticket-center"><small>COURSE EXPERIENCE</small><strong>免费试听</strong><span>课程体验 · 名额有限</span></div>
              <div class="ticket-bottom"><span>线上申请 · 结果可追踪</span><span>↗</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="closing-section">
      <div class="home-container closing-layout">
        <div>
          <p class="section-eyebrow"><span></span> START WITH A QUESTION</p>
          <h2>你的下一步，<br>从一个好问题开始。</h2>
        </div>
        <router-link to="/agent" class="button button-dark">开始使用知课行 <ArrowRightIcon class="button-icon" /></router-link>
      </div>
    </section>

    <footer class="home-footer">
      <div class="home-container footer-content">
        <div class="footer-brand"><span class="mini-mark">知</span><span>知课行 <small>AI 课程服务平台</small></span></div>
        <details class="experiment-links">
          <summary>更多体验功能 <ChevronDownIcon /></summary>
          <div>
            <router-link v-for="item in experiments" :key="item.path" :to="item.path">{{ item.label }}</router-link>
          </div>
        </details>
        <span class="footer-note">让知识，成为可靠的行动。</span>
      </div>
    </footer>
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --page-bg: #f7f8f5;
  --page-ink: #142a2c;
  --page-muted: #617473;
  min-height: calc(100vh - 65px);
  color: var(--page-ink);
  background: var(--page-bg);
  overflow: hidden;
}

.home-container { width: min(1240px, calc(100% - 64px)); margin-inline: auto; }
.home-section { padding-block: 112px; }
.button {
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 0 23px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 760;
  letter-spacing: .01em;
  transition: transform .25s ease, background .25s ease, box-shadow .25s ease, color .25s ease;
}
.button:hover { transform: translateY(-3px); }
.button:focus-visible, .capability-card:focus-visible, .experiment-links a:focus-visible { outline: 3px solid #66d9b2; outline-offset: 4px; }
.button-icon { width: 18px; height: 18px; flex: 0 0 auto; }
.button-primary { color: #092924; background: #83e6bc; box-shadow: 0 14px 38px rgba(84, 223, 172, .18); }
.button-primary:hover { background: #a0f3d0; box-shadow: 0 18px 44px rgba(84, 223, 172, .28); }
.button-ghost { color: #e6f6ee; border: 1px solid rgba(224, 250, 241, .3); background: rgba(255, 255, 255, .055); }
.button-ghost:hover { background: rgba(255, 255, 255, .12); }
.button-light { color: #143c31; background: #f6faf3; }
.button-light:hover { background: #fff; }
.button-dark { color: white; background: #173f39; }
.button-dark:hover { background: #0d302b; }

.hero {
  position: relative;
  isolation: isolate;
  color: #f7fff9;
  background: #0b2025;
  background-image:
    linear-gradient(125deg, rgba(7, 29, 35, 0) 10%, rgba(33, 83, 71, .24) 100%),
    radial-gradient(circle at 76% 45%, rgba(91, 190, 145, .18), transparent 32%);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: .18;
  background-image: linear-gradient(rgba(217, 255, 234, .1) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 255, 234, .1) 1px, transparent 1px);
  background-size: 84px 84px;
  mask-image: linear-gradient(to right, transparent 8%, #000 100%);
}
.hero-glow { position: absolute; width: 500px; aspect-ratio: 1; border-radius: 50%; filter: blur(85px); pointer-events: none; }
.hero-glow-one { right: -170px; top: -240px; background: rgba(49, 171, 121, .16); }
.hero-glow-two { left: -300px; bottom: -300px; background: rgba(31, 115, 121, .17); }
.hero-layout { min-height: 655px; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); align-items: center; gap: 64px; padding-block: 78px 94px; position: relative; }
.hero-copy { position: relative; z-index: 2; }
.hero-badge { width: fit-content; display: flex; align-items: center; gap: 11px; padding: 8px 12px; border: 1px solid rgba(153, 238, 199, .22); border-radius: 999px; color: #afeacb; background: rgba(125, 225, 179, .065); font-size: 12px; font-weight: 700; letter-spacing: .065em; }
.badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #8cf0bd; box-shadow: 0 0 0 5px rgba(140, 240, 189, .13); }
.hero h1 { margin-top: 34px; color: #f8fff9; font-size: clamp(46px, 4.5vw, 72px); font-weight: 820; line-height: 1.16; letter-spacing: -.055em; }
.hero h1 span { color: #8de6b7; }
.narrow-break { display: none; }
.hero-description { max-width: 560px; margin-top: 26px; color: #b9cfca; font-size: 16px; line-height: 1.95; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 34px; }
.hero-points { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 42px; padding-top: 21px; border-top: 1px solid rgba(221, 255, 237, .12); color: #a9c3b8; font-size: 12px; }
.hero-points span { display: inline-flex; align-items: center; gap: 7px; }
.hero-points svg { width: 15px; height: 15px; color: #80d6ae; }
.hero-bottom-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(143, 244, 190, .55), transparent); }

.hero-visual { min-height: 475px; display: grid; place-items: center; position: relative; }
.visual-orbit { position: absolute; border: 1px solid rgba(169, 238, 202, .12); border-radius: 50%; transform: rotate(-21deg); }
.orbit-one { width: 550px; height: 330px; }
.orbit-two { width: 460px; height: 450px; transform: rotate(36deg); }
.visual-shell { width: min(100%, 505px); position: relative; z-index: 1; border: 1px solid rgba(183, 255, 213, .22); border-radius: 22px; overflow: hidden; background: rgba(246, 255, 249, .095); box-shadow: 0 34px 100px rgba(0, 10, 15, .37), inset 0 1px rgba(255, 255, 255, .15); backdrop-filter: blur(24px); transform: rotate(-2deg); }
.visual-topbar { height: 52px; display: flex; align-items: center; justify-content: space-between; padding-inline: 19px; border-bottom: 1px solid rgba(219, 255, 234, .13); background: rgba(255, 255, 255, .045); }
.visual-topbar-brand { display: inline-flex; align-items: center; gap: 9px; color: #ebfff3; font-size: 12px; font-weight: 760; }
.mini-mark { width: 25px; height: 25px; display: inline-grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: #09392d; background: linear-gradient(140deg, #a9f4ce, #57cfa0); font-size: 14px; font-weight: 900; }
.visual-topbar-status { display: inline-flex; align-items: center; gap: 6px; color: #9fbfb0; font-size: 10px; }
.visual-topbar-status i { width: 6px; height: 6px; border-radius: 50%; background: #83e8b1; }
.visual-conversation { display: flex; flex-direction: column; gap: 13px; padding: 21px; }
.visual-label { color: #a3c7b9; font-size: 10px; font-weight: 760; letter-spacing: .13em; }
.question-bubble { width: min(92%, 395px); align-self: flex-end; padding: 13px 15px; border: 1px solid rgba(206, 254, 222, .14); border-radius: 14px 14px 4px 14px; color: #e3f7ec; background: rgba(113, 204, 160, .13); font-size: 12px; line-height: 1.65; }
.assistant-row { display: flex; gap: 10px; align-items: flex-start; margin-top: 2px; }
.assistant-avatar { width: 27px; height: 27px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid rgba(170, 246, 197, .35); border-radius: 9px; color: #9ef0c4; background: rgba(149, 241, 190, .12); }
.assistant-avatar svg { width: 16px; height: 16px; }
.assistant-answer { padding-top: 1px; }
.assistant-answer strong { color: #e9fff2; font-size: 12px; font-weight: 730; }
.assistant-answer p { margin-top: 5px; color: #adcbc0; font-size: 11px; line-height: 1.6; }
.reference-card { display: flex; align-items: center; gap: 10px; margin-left: 36px; padding: 11px 12px; border: 1px solid rgba(191, 244, 210, .17); border-radius: 11px; background: rgba(248, 255, 250, .075); }
.reference-card > svg:first-child { width: 24px; height: 24px; color: #9de3bc; }
.reference-card span { display: grid; gap: 3px; }
.reference-card strong { font-size: 11px; font-weight: 700; }
.reference-card small { color: #a7c3b7; font-size: 10px; }
.reference-arrow { width: 15px; height: 15px; margin-left: auto; color: #a8d9bd; }
.approval-card { display: flex; align-items: center; gap: 11px; margin-left: 36px; padding: 12px; border: 1px solid rgba(248, 209, 145, .34); border-radius: 11px; background: rgba(228, 174, 101, .11); }
.approval-icon { width: 28px; height: 28px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: #ffe0a9; background: rgba(244, 187, 114, .16); }
.approval-icon svg { width: 16px; height: 16px; }
.approval-card div:nth-child(2) { display: grid; gap: 3px; }
.approval-card small { color: #e0cba9; font-size: 10px; }
.approval-card strong { color: #fff0d7; font-size: 11px; font-weight: 740; }
.approval-pill { margin-left: auto; padding: 4px 7px; border: 1px solid rgba(255, 220, 160, .3); border-radius: 5px; color: #ffe2af; font-size: 9px; white-space: nowrap; }
.visual-bottom { display: flex; align-items: center; gap: 10px; padding: 11px 21px 13px; border-top: 1px solid rgba(219, 255, 234, .12); color: #a8c4b9; font-size: 10px; }
.visual-bottom b { margin-inline: 4px; color: #6bd3a3; font-weight: 700; }
.flow-line { display: inline-flex; gap: 3px; }
.flow-line i { width: 5px; height: 5px; border-radius: 50%; background: #74dfad; }
.flow-line i:nth-child(2) { opacity: .65; }.flow-line i:nth-child(3) { opacity: .35; }
.floating-note { position: absolute; right: -13px; bottom: 9px; z-index: 2; display: flex; align-items: center; gap: 10px; width: 230px; padding: 12px; border: 1px solid rgba(160, 235, 190, .35); border-radius: 12px; background: #effff4; box-shadow: 0 18px 50px rgba(1, 15, 17, .26); color: #174d3a; transform: rotate(4deg); }
.floating-icon { width: 33px; height: 33px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; background: #d7f5e1; }
.floating-icon svg, .floating-check { width: 18px; height: 18px; }
.floating-note > span:nth-child(2) { display: grid; gap: 3px; }.floating-note strong { font-size: 11px; font-weight: 800; }.floating-note small { color: #648576; font-size: 9px; }
.floating-check { margin-left: auto; color: #219265; }
.visual-caption { position: absolute; bottom: -22px; right: 12px; color: rgba(202, 233, 215, .46); font-size: 10px; letter-spacing: .04em; }

.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 48px; margin-bottom: 40px; }
.section-eyebrow { display: flex; align-items: center; gap: 10px; color: #397e67; font-size: 11px; font-weight: 850; letter-spacing: .16em; }
.section-eyebrow span { width: 17px; height: 2px; background: #52b88a; }
.section-heading h2, .workflow-heading h2, .closing-layout h2 { margin-top: 18px; font-size: clamp(34px, 3.2vw, 49px); line-height: 1.25; letter-spacing: -.045em; font-weight: 820; }
.section-summary { max-width: 355px; margin-bottom: 5px; color: var(--page-muted); font-size: 14px; line-height: 1.9; }
.capability-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.capability-card { min-height: 342px; display: flex; flex-direction: column; position: relative; padding: 24px; border: 1px solid #e2e9e4; border-radius: 17px; color: #1b3431; background: #fff; box-shadow: 0 12px 30px rgba(14, 56, 47, .035); text-decoration: none; overflow: hidden; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.capability-card::after { content: ''; position: absolute; inset: auto -50px -65px auto; width: 150px; height: 150px; border-radius: 50%; background: var(--card-glow); filter: blur(38px); opacity: .5; }
.capability-card:hover { transform: translateY(-7px); border-color: #a3cdb7; box-shadow: 0 23px 58px rgba(14, 56, 47, .11); }
.card-top, .card-footer { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.card-icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 14px; color: var(--card-accent); background: var(--card-tint); }
.card-icon svg { width: 25px; height: 25px; }
.card-number { color: #a9b9b2; font-size: 12px; font-weight: 800; letter-spacing: .06em; }
.tone-mint { --card-accent: #187759; --card-tint: #dff5e9; --card-glow: #9debc1; }
.tone-blue { --card-accent: #3f70a9; --card-tint: #e9f2fc; --card-glow: #acd4f0; }
.tone-gold { --card-accent: #a6762f; --card-tint: #fbf0db; --card-glow: #efd7a0; }
.tone-violet { --card-accent: #7e69aa; --card-tint: #f0ebfa; --card-glow: #d6c5f3; }
.card-category { margin-top: 35px; color: var(--card-accent); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.capability-card h3 { margin-top: 10px; font-size: 20px; font-weight: 780; line-height: 1.4; letter-spacing: -.025em; }
.card-description { margin-top: 13px; color: #667875; font-size: 12px; line-height: 1.85; }
.card-footer { margin-top: auto; padding-top: 25px; color: #3f6c60; font-size: 10px; font-weight: 700; }
.card-footer svg { width: 16px; height: 16px; }

.workflow-section { background: #edf3ed; }
.workflow-heading { max-width: 675px; }
.workflow-heading h2 em { color: #378a68; font-style: normal; }
.workflow-heading > p:last-child { margin-top: 18px; color: #617473; font-size: 14px; line-height: 1.8; }
.workflow-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 58px; }
.workflow-step { min-height: 183px; position: relative; padding: 26px 10px 0 0; border-top: 1px solid #a6c4b4; }
.workflow-step::before { content: ''; position: absolute; width: 9px; height: 9px; top: -5px; left: 0; border: 2px solid #448b68; border-radius: 50%; background: #edf3ed; }
.step-number { color: #68a688; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.workflow-step h3 { margin-top: 24px; font-size: 19px; font-weight: 770; }
.workflow-step p { max-width: 290px; margin-top: 12px; color: #627673; font-size: 12px; line-height: 1.8; }

.trial-section { padding-block: 88px; }
.trial-panel { min-height: 420px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, .9fr); align-items: center; gap: 34px; padding: 55px 68px; border-radius: 24px; position: relative; overflow: hidden; color: #f8fffa; background: radial-gradient(circle at 78% 14%, rgba(135, 217, 152, .29), transparent 34%), linear-gradient(120deg, #1f5445, #12372f 70%); }
.trial-panel::before { content: ''; position: absolute; inset: 0; opacity: .22; background-image: radial-gradient(circle, rgba(241, 255, 236, .55) 1px, transparent 1px); background-size: 25px 25px; mask-image: linear-gradient(90deg, transparent 35%, #000 100%); }
.trial-copy { position: relative; z-index: 1; }
.trial-eyebrow { display: flex; align-items: center; gap: 7px; color: #aceecb; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.trial-eyebrow svg { width: 17px; height: 17px; }
.trial-copy h2 { margin-top: 19px; font-size: clamp(32px, 3vw, 45px); line-height: 1.27; font-weight: 810; letter-spacing: -.04em; }
.trial-copy > p:nth-of-type(2) { max-width: 475px; margin-top: 17px; color: #c8e3d4; font-size: 13px; line-height: 1.9; }
.trial-copy .button { margin-top: 26px; }
.trial-art { height: 300px; position: relative; display: grid; place-items: center; }
.ticket { width: 355px; height: 229px; position: absolute; border-radius: 18px; }
.ticket-back { transform: translate(23px, -16px) rotate(13deg); border: 1px solid rgba(228, 255, 226, .28); background: rgba(194, 241, 198, .15); }
.ticket-front { display: flex; flex-direction: column; padding: 20px; border: 1px solid rgba(255, 255, 255, .75); background: linear-gradient(140deg, #fbfff7, #e6f5e5); color: #174738; box-shadow: 0 30px 60px rgba(4, 29, 19, .3); transform: rotate(-7deg); }
.ticket-brand, .ticket-bottom { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; }
.ticket-brand .mini-mark { width: 22px; height: 22px; border-radius: 6px; font-size: 12px; }
.ticket-brand > span:last-child { margin-left: auto; color: #86a798; font-size: 8px; letter-spacing: .18em; }
.ticket-center { display: grid; gap: 7px; margin-top: 28px; }
.ticket-center small { color: #77a28c; font-size: 9px; font-weight: 750; letter-spacing: .15em; }
.ticket-center strong { font-size: 30px; font-weight: 850; letter-spacing: -.04em; }
.ticket-center span { color: #6f8b7c; font-size: 10px; }
.ticket-bottom { justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px dashed #afcdb8; color: #55826b; font-size: 9px; }
.ticket-bottom span:last-child { font-size: 20px; line-height: 1; }

.closing-section { padding-block: 88px; background: #f0f2ec; }
.closing-layout { display: flex; align-items: end; justify-content: space-between; gap: 40px; }
.home-footer { padding-block: 29px; color: #62736e; background: #f0f2ec; border-top: 1px solid #e0e8df; }
.footer-content { display: flex; align-items: center; gap: 35px; }
.footer-brand { display: inline-flex; align-items: center; gap: 10px; color: #173d32; font-size: 15px; font-weight: 850; white-space: nowrap; }
.footer-brand > span:last-child { display: grid; gap: 2px; }.footer-brand small { color: #7d9286; font-size: 9px; font-weight: 650; letter-spacing: .06em; }
.experiment-links { margin-left: auto; position: relative; font-size: 11px; }
.experiment-links summary { display: flex; align-items: center; gap: 5px; list-style: none; cursor: pointer; font-weight: 700; }
.experiment-links summary::-webkit-details-marker { display: none; }
.experiment-links summary svg { width: 13px; height: 13px; transition: transform .2s; }.experiment-links[open] summary svg { transform: rotate(180deg); }
.experiment-links > div { position: absolute; right: 0; bottom: 26px; width: 145px; display: grid; gap: 1px; padding: 7px; border: 1px solid #d7e2d8; border-radius: 10px; background: #fff; box-shadow: 0 14px 40px rgba(17, 57, 39, .12); }
.experiment-links a { padding: 7px 9px; border-radius: 5px; text-decoration: none; white-space: nowrap; }.experiment-links a:hover { background: #edf5ee; }
.footer-note { font-size: 11px; white-space: nowrap; }

.home-dark { --page-bg: #17231f; --page-ink: #e8f2e9; --page-muted: #9fb4a9; }
.home-dark .capability-card { color: #e6f0e9; background: #223129; border-color: #344b3c; }
.home-dark .card-description, .home-dark .workflow-heading > p:last-child, .home-dark .workflow-step p { color: #a3b8a9; }
.home-dark .workflow-section, .home-dark .closing-section, .home-dark .home-footer { background: #1d2b23; }
.home-dark .workflow-step { border-color: #476b53; }.home-dark .workflow-step::before { background: #1d2b23; }
.home-dark .home-footer { border-color: #344a39; }.home-dark .footer-brand { color: #e0f0e4; }
.home-dark .experiment-links > div { background: #26362a; border-color: #47604a; }.home-dark .experiment-links a:hover { background: #344c3b; }
.home-dark .card-footer { color: #a1d8b6; }

@media (max-width: 1100px) {
  .hero-layout { gap: 24px; }.hero h1 { font-size: clamp(43px, 5vw, 60px); }
  .capability-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .capability-card { min-height: 290px; }.card-category { margin-top: 26px; }
}
@media (max-width: 800px) {
  .home-container { width: min(100% - 36px, 620px); }.home-section { padding-block: 76px; }
  .hero-layout { grid-template-columns: 1fr; gap: 38px; padding-block: 74px 82px; }
  .hero-visual { min-height: 420px; }.visual-shell { max-width: 480px; }
  .section-heading { display: block; }.section-summary { margin-top: 20px; }
  .workflow-steps { gap: 15px; }.trial-panel { grid-template-columns: 1fr; padding: 40px; }.trial-art { height: 250px; }
}
@media (max-width: 600px) {
  .home-container { width: calc(100% - 32px); }.home-section { padding-block: 62px; }
  .hero-layout { padding-block: 62px 80px; }.hero h1 { margin-top: 28px; font-size: clamp(41px, 10vw, 54px); }
  .hero-description { margin-top: 20px; font-size: 14px; }.hero-actions { display: grid; }.hero-actions .button { width: 100%; justify-content: space-between; }
  .hero-points { gap: 12px 17px; margin-top: 29px; }
  .hero-visual { min-height: 345px; }.visual-shell { transform: none; }.visual-conversation { padding: 16px; gap: 10px; }.floating-note { right: -3px; bottom: -11px; transform: rotate(3deg) scale(.86); transform-origin: bottom right; }.visual-caption { bottom: -38px; }
  .section-heading h2, .workflow-heading h2, .closing-layout h2 { font-size: 34px; }
  .capability-grid { grid-template-columns: 1fr; gap: 12px; }.capability-card { min-height: 270px; padding: 22px; }
  .workflow-steps { grid-template-columns: 1fr; gap: 6px; margin-top: 35px; }.workflow-step { min-height: 130px; }.workflow-step h3 { margin-top: 12px; }
  .trial-section { padding-block: 48px; }.trial-panel { gap: 0; padding: 32px 25px; }.trial-copy h2 { font-size: 32px; }.trial-art { height: 230px; transform: scale(.85); transform-origin: center top; }
  .closing-section { padding-block: 60px; }.closing-layout { display: block; }.closing-layout .button { margin-top: 27px; }
  .footer-content { flex-wrap: wrap; gap: 18px; }.experiment-links { margin-left: auto; }.footer-note { width: 100%; }
}
@media (max-width: 360px) {
  .narrow-break { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .home-page *, .home-page *::before, .home-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
</style>
