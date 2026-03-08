const TOKEN_STORAGE_KEY = 'promptops.auth.token'
const USER_STORAGE_KEY = 'promptops.auth.user'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function storeSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function getStoredUser<T>() {
  const value = localStorage.getItem(USER_STORAGE_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuthRedirect?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers ?? {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    if (response.status === 401 && token && !options.skipAuthRedirect) {
      clearStoredSession()
      window.dispatchEvent(new Event('promptops:auth-expired'))
    }

    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return payload as T
}
