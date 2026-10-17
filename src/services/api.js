export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')
const TOKEN_KEY = 'zhikexing_token'

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
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    // 代理和跨域过滤器可能返回纯文本错误，保留实际反馈。
    throw new Error(response.ok ? '服务响应格式错误，请重试' : text)
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
    const error = new Error(result.msg || result.message || `请求失败（${response.status}）`)
    error.retryAfter = Number(response.headers.get('Retry-After')) || 0
    throw error
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
