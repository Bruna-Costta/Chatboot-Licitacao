const API_URL = process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {
  status?: number
  data?: unknown
}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null
  const error = new ApiError(data?.message ?? "Não foi possível concluir a solicitação.")
  error.status = response.status
  error.data = data
  throw error
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  // Elysia serializes a handler's `null` return (e.g. GET /triage with no active triage)
  // as an EMPTY body, not the JSON text "null" — response.json() throws a SyntaxError on
  // an empty body, so read as text first and only parse when there's something to parse.
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as TResponse
}

export async function apiPost<TResponse>(path: string, body?: unknown): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  return (await response.json()) as TResponse
}

export async function apiPostForm<TResponse>(path: string, formData: FormData): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    // No content-type header — the browser sets multipart/form-data with the correct boundary.
    body: formData,
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  return (await response.json()) as TResponse
}

export async function apiPatch<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseErrorOrThrow(response)
  }

  return (await response.json()) as TResponse
}
