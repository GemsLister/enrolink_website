import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (_) {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('userProfile')
      if (cached) return JSON.parse(cached)
    } catch { void 0 }
    return token ? decodeJwt(token) : null
  })

  // Persist token changes
  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')

    const payload = token ? decodeJwt(token) : null
    if (payload) {
      setUser(payload)
    } else {
      try {
        const cached = localStorage.getItem('userProfile')
        if (cached) setUser(JSON.parse(cached))
        else setUser(null)
      } catch (_) {
        setUser(null)
      }
    }

    async function refresh() {
      try {
        if (!token) return
        let roleSource = payload
        if (!roleSource) {
          try { const cached = localStorage.getItem('userProfile'); roleSource = cached ? JSON.parse(cached) : null } catch { void 0 }
        }
        const role = String((roleSource || {}).role || '').toUpperCase()
        if (!role) return
        const res = role === 'OFFICER' ? await api.request('GET', '/auth/officer/me', { token }) : await api.request('GET', '/auth/me', { token })
        if (res && res.user) {
          setUser(res.user)
          try { localStorage.setItem('userProfile', JSON.stringify(res.user)) } catch { void 0 }
        }
      } catch { void 0 }
    }
    refresh()
  }, [token])

  const isAuthenticated = !!token

  const login = useCallback(async (credentials) => {
    try {
      const response = await api.login(credentials)
      const tokenStr = response.token
      localStorage.setItem('token', tokenStr)
      setToken(tokenStr)
      try {
        const payload = decodeJwt(tokenStr) || {}
        const role = String(payload.role || '').toUpperCase()
        const res = role === 'OFFICER' ? await api.request('GET', '/auth/officer/me', { token: tokenStr }) : await api.request('GET', '/auth/me', { token: tokenStr })
        if (res && res.user) {
          setUser(res.user)
          try { localStorage.setItem('userProfile', JSON.stringify(res.user)) } catch { void 0 }
        }
      } catch { void 0 }
      return response
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    try { localStorage.removeItem('userProfile') } catch { void 0 }
    setToken('')
  }, [])

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated,
    setToken,
    login,
    logout,
    authHeader: token ? { Authorization: `Bearer ${token}` } : {},
  }), [token, user, isAuthenticated, login, logout])

  return value
}
