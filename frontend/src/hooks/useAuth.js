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
  const [user, setUser] = useState(() => (token ? decodeJwt(token) : null))

  // Persist token changes
  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    setUser(token ? decodeJwt(token) : null)
  }, [token])

  const isAuthenticated = !!token

  const login = useCallback(async ({ email, password, captcha }) => {
    const res = await api.login({ email, password, captcha })
    setToken(res.token)
    return res
  }, [])

  const logout = useCallback(() => {
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
