import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { api } from '../api/client'
import RecaptchaCheck from '../components/RecaptchaCheck'
import logo from '../assets/enrolink-logo 2.png'
import illo from '../assets/Product-We-got-a-problem-01.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await api.requestPasswordReset({ email, captcha })
      setMessage(res.message || 'If the email is registered, a reset link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email to send a code" illustration={illo} logo={logo}>
      <form onSubmit={onSubmit} className="space-y-4">
        {message && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <RecaptchaCheck onChange={setCaptcha} />
        <button disabled={loading || !captcha} className="w-full bg-[#8a1d35] text-white rounded-md py-2 disabled:opacity-50">{loading? 'Sending...' : 'Send Email'}</button>
        <div className="text-center text-sm"><Link className="text-[#8a1d35] hover:underline" to="/login">Back to Log in</Link></div>
      </form>
    </AuthLayout>
  )
}
