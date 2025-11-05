import { useMemo } from 'react'

const BASE = import.meta.env.VITE_API_URL || '/api'

export function useApi(token) {
  return useMemo(() => {
    async function request(path, { method = 'GET', body } = {}) {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data?.error || 'Request failed'
        const err = new Error(message)
        err.status = res.status
        throw err
      }
      return data
    }

    return {
      get: (p) => request(p),
      post: (p, body) => request(p, { method: 'POST', body }),
      put: (p, body) => request(p, { method: 'PUT', body }),
      del: (p) => request(p, { method: 'DELETE' }),
    }
  }, [token])
}
