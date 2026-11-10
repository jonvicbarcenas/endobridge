export interface AuthResponse {
  token: string
  user: {
    userId: string
    email: string
  }
  termsAccepted: boolean
}

export interface StoredRecord<T> {
  id: string
  userId: string
  createdAt: string
  data: T
}

export class BackendApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'BackendApiError'
    this.status = status
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new BackendApiError(body?.error ?? 'backend request failed', response.status)
  }

  return (await response.json()) as T
}

export class BackendAPIService {
  register(email: string, password: string) {
    return request<{ user: AuthResponse['user']; recoveryCode?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  recoverPassword(email: string, recoveryCode: string, newPassword: string) {
    return request<{ reset: true; recoveryCode: string }>('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ email, recoveryCode, newPassword }),
    })
  }

  issueRecoveryCode(token: string) {
    return request<{ recoveryCode: string }>('/auth/recovery-code', {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    })
  }

  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  acceptTerms(token: string) {
    return request('/terms/accept', {
      method: 'POST',
      token,
      body: JSON.stringify({
        acceptedTerms: true,
        acceptedPrivacy: true,
        confirmedAge: true,
        acceptedDisclaimer: true,
      }),
    })
  }

  profile(token: string) {
    return request<{ user: AuthResponse['user']; termsAccepted: boolean }>('/auth/me', { token })
  }

  listRecords<T>(token: string, collectionPath: string) {
    return request<{ records: StoredRecord<T>[] }>(`/${collectionPath}`, { token })
  }

  async listRecordData<T>(token: string, collectionPath: string) {
    const response = await this.listRecords<T>(token, collectionPath)
    return response.records.map((record) => record.data)
  }

  createRecord<T>(token: string, collectionPath: string, data: unknown) {
    return request<StoredRecord<T>>(`/${collectionPath}`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    })
  }

  updateRecord<T>(token: string, collectionPath: string, id: string, data: unknown) {
    return request<StoredRecord<T>>(`/${collectionPath}/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    })
  }

  deleteRecord(token: string, collectionPath: string, id: string) {
    return request<{ id: string; deleted: boolean }>(`/${collectionPath}/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  deleteMonitoringData(token: string, deletedDataType: string) {
    return request('/account/data-delete', {
      method: 'POST',
      token,
      body: JSON.stringify({ deletedDataType }),
    })
  }

  logout(token: string) {
    return request<{ loggedOut: true }>('/auth/logout', { method: 'POST', token })
  }

  scanLabDocument<T>(token: string, dataUrl: string) {
    return request<T>('/lab-documents/scan', {
      method: 'POST',
      token,
      body: JSON.stringify({ dataUrl }),
    })
  }

  /**
   * Same as scanLabDocument, but reports upload progress (0-1) and can be
   * cancelled. fetch() cannot report upload progress, so this uses XHR.
   */
  scanLabDocumentWithProgress<T>(
    token: string,
    dataUrl: string,
    {
      onUploadProgress,
      onUploadComplete,
      signal,
    }: {
      onUploadProgress?: (fraction: number) => void
      onUploadComplete?: () => void
      signal?: AbortSignal
    } = {},
  ) {
    if (typeof XMLHttpRequest === 'undefined') return this.scanLabDocument<T>(token, dataUrl)

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}/api/lab-documents/scan`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.timeout = 120_000
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onUploadProgress?.(event.loaded / event.total)
      }
      xhr.upload.onload = () => onUploadComplete?.()
      xhr.onload = () => {
        let body: unknown
        try {
          body = JSON.parse(xhr.responseText)
        } catch {
          body = null
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as T)
          return
        }
        const message = (body as { error?: string } | null)?.error ?? 'backend request failed'
        reject(new BackendApiError(message, xhr.status))
      }
      xhr.onerror = () => reject(new BackendApiError('network error', 0))
      xhr.ontimeout = () => reject(new BackendApiError('request timed out', 408))
      xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
      signal?.addEventListener('abort', () => xhr.abort(), { once: true })
      xhr.send(JSON.stringify({ dataUrl }))
    })
  }

  generateReport<T>(token: string, sessionId: string) {
    return request<T>('/reports/generate', {
      method: 'POST',
      token,
      body: JSON.stringify({ sessionId }),
    })
  }
}
