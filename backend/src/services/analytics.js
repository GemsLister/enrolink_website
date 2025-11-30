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

export async function sendGaEvent() { return }

