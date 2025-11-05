import { useEffect, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

export default function RecaptchaCheck({ onChange }) {
  const [siteKey, setSiteKey] = useState('')

  useEffect(() => {
    const key = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
    setSiteKey(key)
  }, [])

  if (!siteKey) {
    // Render a placeholder if key not configured yet
    return (
      <div className="text-xs text-[#5b5c60] bg-gray-50 border border-gray-200 rounded p-2">
        reCAPTCHA not configured (set VITE_RECAPTCHA_SITE_KEY)
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <ReCAPTCHA sitekey={siteKey} onChange={onChange} />
    </div>
  )
}
