import crypto from 'crypto'

function toBool(v) {
  return String(v || '').toLowerCase() === 'true'
}

function getGaConfig() {
  const measurementId = process.env.GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID
  const apiSecret = process.env.GA_API_SECRET
  return { measurementId, apiSecret }
}

function buildClientId() {
  const rnd = crypto.randomBytes(8).toString('hex')
  const ts = Date.now().toString(36)
  return `${rnd}.${ts}`
}

export async function sendGaEvent({ userId, eventName, params }) {
  const { measurementId, apiSecret } = getGaConfig()
  if (!measurementId || !apiSecret) return
  const endpoint = new URL('https://www.google-analytics.com/mp/collect')
  endpoint.searchParams.set('measurement_id', measurementId)
  endpoint.searchParams.set('api_secret', apiSecret)
  const payload = {
    client_id: buildClientId(),
    user_id: toBool(process.env.GA_USE_USER_ID) ? String(userId || '') || undefined : undefined,
    events: [
      { name: eventName, params: params || {} }
    ]
  }
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`GA MP error ${resp.status}: ${text}`)
    }
  } catch (_) { }
}

