// Simple API client using fetch
const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  google: (payload) => request('/auth/google', { method: 'POST', body: payload }),
  signupWithInvite: (payload) => request('/auth/signup-with-invite', { method: 'POST', body: payload }),
  requestPasswordReset: (payload) => request('/auth/request-password-reset', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
};
