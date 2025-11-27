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

  const login = async (credentials) => {
  try {
    const response = await api.login(credentials);
    const token = response.token; // Make sure the backend returns { token: '...' }
    localStorage.setItem('token', token);
    setToken(token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

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
