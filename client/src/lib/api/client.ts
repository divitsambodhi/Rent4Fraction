import { env } from '@/lib/config/env'
import { getCurrentFirebaseToken } from '@/lib/firebase'

export interface ApiErrorDetail {
  field?: string
  message: string
  code?: string
}

export class ApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details?: ApiErrorDetail[]

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  idempotencyKey?: string
  skipAuth?: boolean
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const fullUrl = this.baseUrl.startsWith('http')
      ? `${this.baseUrl}${cleanPath}`
      : `${cleanPath}`

    if (!params) return fullUrl

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val))
      }
    })

    const queryString = searchParams.toString()
    return queryString ? `${fullUrl}?${queryString}` : fullUrl
  }

  public async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
    retryWithFreshToken = true
  ): Promise<T> {
    const {
      params,
      idempotencyKey,
      skipAuth = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = options

    const url = this.buildUrl(path, params)
    const requestId = generateRequestId()

    const headers = new Headers(customHeaders)
    headers.set('X-Request-Id', requestId)
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }

    if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey)
    }

    if (!skipAuth) {
      const token = await getCurrentFirebaseToken(false)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Handle 401 token expiry retry once for idempotent (GET/HEAD) or non-mutating calls
    if (response.status === 401 && retryWithFreshToken && !skipAuth) {
      const freshToken = await getCurrentFirebaseToken(true)
      if (freshToken) {
        return this.request<T>(path, options, false)
      }
    }

    if (!response.ok) {
      let errCode = `http_${response.status}`
      let errMsg = response.statusText || 'Request failed'
      let errDetails: ApiErrorDetail[] | undefined

      try {
        const errorJson = await response.json()
        if (errorJson && typeof errorJson === 'object') {
          if (errorJson.error) {
            errCode = errorJson.error.code || errCode
            errMsg = errorJson.error.message || errMsg
            errDetails = errorJson.error.details
          } else if (errorJson.detail) {
            errMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail)
          } else if (errorJson.message) {
            errMsg = errorJson.message
          }
        }
      } catch {
        // Response body not JSON
      }

      throw new ApiError(response.status, errCode, errMsg, errDetails)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  public post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(env.API_BASE_URL)

