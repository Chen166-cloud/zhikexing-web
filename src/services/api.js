const BASE_URL = 'http://localhost:8080'
const TOKEN_KEY = 'iiip_token'

export const authStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token) {
    if (!token) {
      throw new Error('登录响应缺少 token')
    }
    localStorage.setItem(TOKEN_KEY, token)
    window.dispatchEvent(new CustomEvent('auth-changed'))
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new CustomEvent('auth-changed'))
  }
}

export const getAuthHeaders = (headers = {}) => {
  const token = authStorage.getToken()
  return token ? { ...headers, Authorization: token } : headers
}

const parseJson = async (response) => {
  const text = await response.text()
  return text ? JSON.parse(text) : {}
}

const assertOk = async (response) => {
  if (response.status === 401) {
    authStorage.clearToken()
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

const authRequest = async (path, body) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body || {})
  })
  const result = await parseJson(response)
  if (response.status === 401) {
    authStorage.clearToken()
  }
  if (!response.ok || result.ok === 0) {
    throw new Error(result.msg || `HTTP error! status: ${response.status}`)
  }
  return result
}

export const authAPI = {
  async login(userName, password) {
    const result = await authRequest('/user/login', { userName, password })
    authStorage.setToken(result.data)
    return result
  },

  async register(userName, password) {
    const result = await authRequest('/user/register', { userName, password })
    authStorage.setToken(result.data)
    return result
  },

  async me() {
    const response = await fetch(`${BASE_URL}/user/me`, {
      headers: getAuthHeaders()
    })
    const result = await parseJson(response)
    if (!response.ok || result.ok === 0) {
      if (response.status === 401) {
        authStorage.clearToken()
      }
      throw new Error(result.msg || `HTTP error! status: ${response.status}`)
    }
    return result.data
  },

  async updateNickname(nickName) {
    const result = await authRequest('/user/nickname', { nickName })
    return result.data
  },

  async logout() {
    try {
      await fetch(`${BASE_URL}/user/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
    } catch (error) {
      console.warn('Logout request failed:', error)
    } finally {
      authStorage.clearToken()
    }
  }
}

export const chatAPI = {
  async sendMessage(data, chatId) {
    const url = new URL(`${BASE_URL}/ai/chat`)
    if (chatId) {
      url.searchParams.append('chatId', chatId)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data instanceof FormData ? data : new URLSearchParams({ prompt: data })
    })
    await assertOk(response)
    return response.body.getReader()
  },

  async createChat(chatId, title, type = 'chat') {
    const response = await fetch(`${BASE_URL}/ai/history/${type}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: chatId, title, type })
    })
    await assertOk(response)
    return await response.json()
  },

  async listTitles(type = 'chat') {
    try {
      const response = await fetch(`${BASE_URL}/ai/history/${type}/titles`, {
        headers: getAuthHeaders()
      })
      await assertOk(response)
      return await response.json() || []
    } catch (error) {
      console.error('API Error:', error)
      return []
    }
  },

  async getChatHistory(type = 'chat') {
    try {
      const response = await fetch(`${BASE_URL}/ai/history/${type}`, {
        headers: getAuthHeaders()
      })
      await assertOk(response)
      const chatIds = await response.json()
      return chatIds.map(id => ({
        id,
        title: type === 'pdf' ? `PDF对话 ${id.slice(-6)}` :
          type === 'service' ? `咨询 ${id.slice(-6)}` :
            `对话 ${id.slice(-6)}`
      }))
    } catch (error) {
      console.error('API Error:', error)
      return []
    }
  },

  async getChatMessages(chatId, type = 'chat') {
    try {
      const response = await fetch(`${BASE_URL}/ai/history/${type}/${chatId}`, {
        headers: getAuthHeaders()
      })
      await assertOk(response)
      const messages = await response.json()
      return messages.map(msg => ({
        ...msg,
        timestamp: new Date()
      }))
    } catch (error) {
      console.error('API Error:', error)
      return []
    }
  },

  async sendGameMessage(prompt, chatId) {
    const response = await fetch(`${BASE_URL}/ai/game?prompt=${encodeURIComponent(prompt)}&chatId=${chatId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
    await assertOk(response)
    return response.body.getReader()
  },

  async sendServiceMessage(prompt, chatId) {
    const response = await fetch(`${BASE_URL}/ai/service?prompt=${encodeURIComponent(prompt)}&chatId=${chatId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
    await assertOk(response)
    return response.body.getReader()
  },

  async deleteChatHistory(chatId, type = 'chat') {
    const response = await fetch(`${BASE_URL}/ai/history/${type}/${chatId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await assertOk(response)
    return await response.json()
  },

  async sendPdfMessage(prompt, chatId) {
    const response = await fetch(`${BASE_URL}/ai/pdf/chat?prompt=${encodeURIComponent(prompt)}&chatId=${chatId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(30000)
    })
    await assertOk(response)
    return response.body.getReader()
  }
}
