/**
 * When NEXT_PUBLIC_API_URL is set (e.g. http://localhost:8000), the frontend
 * uses Django as the backend. When unset, it uses Next.js API routes (same-origin).
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? ""
}

/** Use credentials (cookies) when talking to Django for session auth */
export function getFetchOptions(overrides: RequestInit = {}): RequestInit {
  const base = getApiBaseUrl()
  return {
    ...overrides,
    credentials: base ? "include" : "same-origin",
  }
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "")
  let p = path.startsWith("/") ? path : `/${path}`
  // Django requires trailing slashes for POST; add for all /api/ paths (works for same-origin proxy or explicit backend)
  const [pathPart, query] = p.split("?")
  const isApi = pathPart.startsWith("/api/")
  const slashPath = pathPart.endsWith("/") ? pathPart : `${pathPart}/`
  p = query ? `${isApi ? slashPath : pathPart}?${query}` : (isApi ? slashPath : pathPart)
  return base ? `${base}${p}` : p
}
