import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { api } from '../api/client'
import RecaptchaCheck from '../components/RecaptchaCheck'
import logo from '../assets/enrolink-logo 2.png'
import illo from '../assets/Users-People-Protect-privacy-01.png'

export default function ResetPassword() {
  const [search] = useSearchParams()
  const token = search.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.resetPassword({ token, password, captcha })
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset password" subtitle="Please set your new password" illustration={illo} logo={logo}>
      <form onSubmit={onSubmit} className="space-y-4">
        {!token && <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">Missing token.</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm">New password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Re-enter password</label>
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <RecaptchaCheck onChange={setCaptcha} />
        <button disabled={loading || !token || !captcha} className="w-full bg-[#8a1d35] text-white rounded-md py-2 disabled:opacity-50">{loading? 'Saving...' : 'Continue'}</button>
        <div className="text-center text-sm"><Link className="text-[#8a1d35] hover:underline" to="/login">Back to Log in</Link></div>
      </form>
    </AuthLayout>
  )
}
