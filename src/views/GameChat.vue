<template>
  <div class="game-chat" :class="{ 'dark': isDark }">
    <div class="game-container">
      <!-- 游戏开始界面 -->
      <div v-if="!isGameStarted" class="game-start">
        <h2>今天怎么过</h2>
        <div class="input-area">
          <textarea
            v-model="angerReason"
            placeholder="请输入今天的场景（例：周末在家，但我不想浪费这一天）"
            rows="3"
          ></textarea>
          <button class="start-button" @click="startGame">
            开始游戏
          </button>
        </div>
      </div>

      <!-- 聊天界面 -->
      <div v-else class="chat-main">
        <!-- 游戏统计信息 -->
        <div class="game-stats">
          <div class="stat-item">
            <span class="label">⚡ 体力</span>
            <div class="progress-bar">
              <div
                class="progress energy-bar"
                :style="{ width: `${energy}%` }"
                :class="{
                  'low': energy < 30,
                  'medium': energy >= 30 && energy < 60,
                  'high': energy >= 60
                }"
              ></div>
            </div>
            <span class="value">{{ energy }}/100</span>
          </div>
          <div class="stat-item">
            <span class="label">💰 余额</span>
            <span class="value">{{ money }}元</span>
          </div>
          <div class="stat-item">
            <span class="label">🕐 时间</span>
            <span class="value">{{ gameTime }}</span>
          </div>
          <div class="stat-item">
            <span class="label">
              <CheckCircleIcon class="check-icon" :class="{ 'beating': forgiveness >= 70 }" />
              完成度
            </span>
            <div class="progress-bar">
              <div
                class="progress"
                :style="{ width: `${forgiveness}%` }"
                :class="{
                  'low': forgiveness < 30,
                  'medium': forgiveness >= 30 && forgiveness < 70,
                  'high': forgiveness >= 70
                }"
              ></div>
            </div>
            <span class="value">{{ forgiveness }}%</span>
          </div>
          <div class="stat-item">
            <span class="label">📋 选择</span>
            <span class="value">{{ currentRound }}/{{ MAX_ROUNDS }}</span>
          </div>
        </div>

        <div class="messages" ref="messagesRef">
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="index"
            :message="message"
            :is-stream="isStreaming && index === currentMessages.length - 1"
          />
        </div>
        
        <div class="input-area">
          <textarea
            v-model="userInput"
            @keydown.enter.prevent="sendMessage()"
            placeholder="请输入选项，也可以自定义回答"
            rows="1"
            ref="inputRef"
            :disabled="isGameOver"
          ></textarea>
          <button 
            class="send-button" 
            @click="sendMessage()"
            :disabled="isStreaming || !userInput.trim() || isGameOver"
          >
            <PaperAirplaneIcon class="icon" />
          </button>
        </div>
      </div>

      <!-- 游戏结束提示 -->
      <div v-if="isGameOver" class="game-over" :class="{ 'success': isWin }">
        <div class="result">{{ gameResult }}</div>
        <button class="restart-button" @click="resetGame">
          重新开始
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useDark } from '@vueuse/core'
import { PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'

const isDark = useDark()
const messagesRef = ref(null)
const inputRef = ref(null)
const userInput = ref('')
const isStreaming = ref(false)
const currentChatId = ref(null)
const currentMessages = ref([])
const angerReason = ref('')
const isGameStarted = ref(false)
const isGameOver = ref(false)
const gameResult = ref('')
const isWin = ref(false)   // 游戏胜利标记
const MAX_ROUNDS = 10
const currentRound = ref(0)
const forgiveness = ref(0)
const energy = ref(80)      // 体力值
const money = ref(300)      // 余额
const gameTime = ref('08:00') // 当前时间

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  const textarea = inputRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 开始游戏
const startGame = async () => {
  isGameStarted.value = true
  isGameOver.value = false
  isWin.value = false
  gameResult.value = ''
  currentChatId.value = Date.now().toString()
  currentMessages.value = []
  currentRound.value = 0
  forgiveness.value = 0
  energy.value = 80
  money.value = 300
  gameTime.value = '08:00'

  // 发送开始游戏请求
  const startPrompt = angerReason.value 
    ? `开始游戏，生活场景：${angerReason.value}`
    : '请生成随机生成生活场景，并开始游戏'
  
  await sendMessage(startPrompt)
}

// 重置游戏
const resetGame = () => {
  isGameStarted.value = false
  isGameOver.value = false
  isWin.value = false
  gameResult.value = ''
  currentMessages.value = []
  angerReason.value = ''
  userInput.value = ''
  currentRound.value = 0
  forgiveness.value = 0
  energy.value = 80
  money.value = 300
  gameTime.value = '08:00'
}

// 发送消息
const sendMessage = async (content) => {
  if (isStreaming.value || (!content && !userInput.value.trim())) return
  
  // 使用传入的 content 或用户输入框的内容
  const messageContent = content || userInput.value.trim()
  
  // 添加用户消息
  const userMessage = {
    role: 'user',
    content: messageContent,
    timestamp: new Date()
  }
  currentMessages.value.push(userMessage)
  
  // 清空输入并增加轮次计数
  if (!content) {  // 只有在非传入内容时才清空输入框和计数
    userInput.value = ''
    adjustTextareaHeight()
    currentRound.value++  // 增加轮次计数
  }
  await scrollToBottom()
  
  // 添加助手消息占位
  const assistantMessage = {
    role: 'assistant',
    content: '',
    timestamp: new Date()
  }
  currentMessages.value.push(assistantMessage)
  isStreaming.value = true
  
  let accumulatedContent = ''
  
  try {
    // 确保使用正确的消息内容发送请求
    const reader = await chatAPI.sendGameMessage(messageContent, currentChatId.value)
    const decoder = new TextDecoder('utf-8')
    
    while (true) {
      try {
        const { value, done } = await reader.read()
        if (done) break
        
        // 累积新内容
        accumulatedContent += decoder.decode(value)

        // 解析游戏数值：体力值
        const energyMatch = accumulatedContent.match(/体力值[:：]\s*(\d+)/i)
        if (energyMatch) {
          const val = parseInt(energyMatch[1])
          if (!isNaN(val)) energy.value = Math.min(100, Math.max(0, val))
        }

        // 解析游戏数值：余额
        const moneyMatch = accumulatedContent.match(/余额[:：]\s*(\d+)\s*元/i)
        if (moneyMatch) {
          const val = parseInt(moneyMatch[1])
          if (!isNaN(val)) money.value = val
        }

        // 解析游戏数值：时间
        const timeMatch = accumulatedContent.match(/(?:当前)?时间[:：]\s*(\d{2}:\d{2})/i)
        if (timeMatch) {
          gameTime.value = timeMatch[1]
        }

        // 解析游戏数值：完成度
        const forgivenessMatch = accumulatedContent.match(/完成度[:：]\s*(\d+)/i)
        if (forgivenessMatch) {
          const newForgiveness = parseInt(forgivenessMatch[1])
          if (!isNaN(newForgiveness)) {
            forgiveness.value = Math.min(100, Math.max(0, newForgiveness))
          }
        }
        // 更新消息内容
        await nextTick(() => {
          const updatedMessage = {
            ...assistantMessage,
            content: accumulatedContent
          }
          const lastIndex = currentMessages.value.length - 1
          currentMessages.value.splice(lastIndex, 1, updatedMessage)
        })
        await scrollToBottom()
      } catch (readError) {
        console.error('读取流错误:', readError)
        break
      }
    }

    // 按优先级判断游戏是否结束
    let shouldEnd = false

    // 1. 后端定义的失败条件：体力 ≤ 0 或 余额 < 0
    if (energy.value <= 0) {
      shouldEnd = true
      isWin.value = false
      gameResult.value = '体力耗尽，你累趴了！今天没法继续了 😫'
    } else if (money.value < 0) {
      shouldEnd = true
      isWin.value = false
      gameResult.value = '预算崩盘！余额不足，今天过不下去了 💸'
    }

    // 2. AI 明确标记游戏结束
    if (!shouldEnd && accumulatedContent.includes('游戏结束')) {
      shouldEnd = true
      isWin.value = forgiveness.value >= 70
      gameResult.value = accumulatedContent
    }

    // 3. AI 标记顺利过完今天
    if (!shouldEnd && (accumulatedContent.includes('过得不错') || accumulatedContent.includes('顺利过完'))) {
      shouldEnd = true
      isWin.value = true
      gameResult.value = accumulatedContent
    }

    // 4. 达到最大轮次
    if (!shouldEnd && currentRound.value >= MAX_ROUNDS) {
      shouldEnd = true
      if (forgiveness.value >= 70) {
        isWin.value = true
        gameResult.value = '一天结束了！今天过得还不错！🎉'
      } else if (forgiveness.value >= 40) {
        isWin.value = true
        gameResult.value = `一天结束了！当前完成度${forgiveness.value}，勉强过完了今天~`
      } else {
        isWin.value = false
        gameResult.value = `选择次数已达上限(${MAX_ROUNDS}次)，当前完成度${forgiveness.value}，今天有点失败 😢`
      }
    }

    if (shouldEnd) {
      isGameOver.value = true
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    assistantMessage.content = '抱歉，发生了错误，请稍后重试。'
  } finally {
    isStreaming.value = false
    await scrollToBottom()
  }
}

// 添加计算属性显示剩余轮次
const remainingRounds = computed(() => MAX_ROUNDS - currentRound.value)

onMounted(() => {
  adjustTextareaHeight()
})
</script>

<style scoped lang="scss">
.game-chat {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: var(--bg-color);
  overflow: hidden;
  z-index: 1;

  .game-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: 1.5rem 2rem;
    position: relative;
    height: 100%;
  }

  .game-start {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    min-height: 400px;
    padding: 2rem;
    background: var(--bg-color);
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

    h2 {
      font-size: 2rem;
      color: var(--text-color);
      margin: 0;
    }

    .input-area {
      width: 100%;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      textarea {
        width: 100%;
        padding: 1rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 0.5rem;
        resize: none;
        font-family: inherit;
        font-size: 1rem;
        line-height: 1.5;

        &:focus {
          outline: none;
          border-color: #007CF0;
          box-shadow: 0 0 0 2px rgba(0, 124, 240, 0.1);
        }
      }

      .start-button {
        padding: 1rem 2rem;
        background: #007CF0;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
          background: #0066cc;
        }
      }
    }
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;

    .game-stats {
      position: sticky;
      top: 0;
      background: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 0.75rem 1rem;
      z-index: 10;
      backdrop-filter: blur(5px);
      display: flex;
      gap: 1rem;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
      border-radius: 0.5rem;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
          font-size: 0.85rem;
          opacity: 0.9;

          .check-icon {
            width: 1rem;
            height: 1rem;
            color: #52c41a;

            &.beating {
              animation: heartbeat 1s infinite;
            }
          }
        }

        .value {
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .progress-bar {
          width: 80px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;

          .progress {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 3px;

            &.low {
              background: #ff4d4f;
            }

            &.medium {
              background: #faad14;
            }

            &.high {
              background: #52c41a;
            }
          }

          .energy-bar {
            &.low {
              background: #ff4d4f;
            }
            &.medium {
              background: #faad14;
            }
            &.high {
              background: #1890ff;
            }
          }
        }
      }
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
    }

    .input-area {
      flex-shrink: 0;
      padding: 1.5rem 2rem;
      background: rgba(255, 255, 255, 0.98);
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      gap: 1rem;
      align-items: flex-end;

      textarea {
        flex: 1;
        resize: none;
        border: 1px solid rgba(0, 0, 0, 0.1);
        background: white;
        border-radius: 0.75rem;
        padding: 1rem;
        color: inherit;
        font-family: inherit;
        font-size: 1rem;
        line-height: 1.5;
        max-height: 150px;

        &:focus {
          outline: none;
          border-color: #007CF0;
          box-shadow: 0 0 0 2px rgba(0, 124, 240, 0.1);
        }

        &:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
      }

      .send-button {
        background: #007CF0;
        color: white;
        border: none;
        border-radius: 0.5rem;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover:not(:disabled) {
          background: #0066cc;
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .icon {
          width: 1.25rem;
          height: 1.25rem;
        }
      }
    }
  }

  .game-over {
    position: absolute;
    bottom: 6rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;

    .result {
      font-size: 1.1rem;
    }

    .restart-button {
      padding: 0.5rem 1rem;
      background: #007CF0;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background: #0066cc;
      }
    }

    &.success {
      background: rgba(82, 196, 26, 0.9);
      
      .restart-button {
        background: #52c41a;
        
        &:hover {
          background: #389e0d;
        }
      }
    }
  }
}

.dark {
  .game-start {
    .input-area {
      textarea {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: white;

        &:focus {
          border-color: #007CF0;
          box-shadow: 0 0 0 2px rgba(0, 124, 240, 0.2);
        }
      }
    }
  }

  .chat-main {
    background: rgba(40, 40, 40, 0.95);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);

    .input-area {
      background: rgba(30, 30, 30, 0.98);
      border-top: 1px solid rgba(255, 255, 255, 0.05);

      textarea {
        background: rgba(50, 50, 50, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        color: white;

        &:focus {
          border-color: #007CF0;
          box-shadow: 0 0 0 2px rgba(0, 124, 240, 0.2);
        }

        &:disabled {
          background: rgba(30, 30, 30, 0.95);
        }
      }
    }

    .game-stats {
      background: rgba(0, 0, 0, 0.8);
    }
  }
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
</style>