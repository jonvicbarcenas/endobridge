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
    return request<{ user: AuthResponse['user'] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  scanLabDocument<T>(token: string, dataUrl: string) {
    return request<T>('/lab-documents/scan', {
      method: 'POST',
      token,
      body: JSON.stringify({ dataUrl }),
    })
  }

  generateReport<T>(token: string, synthesis: unknown) {
    return request<T>('/reports/generate', {
      method: 'POST',
      token,
      body: JSON.stringify({ synthesis }),
    })
  }
}
