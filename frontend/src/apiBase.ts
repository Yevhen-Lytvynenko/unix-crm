/** Empty in dev (Vite proxy); in prod set VITE_API_BASE_URL to API origin without trailing slash. */
const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
const API_BASE = raw.replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${p}` : p
}
