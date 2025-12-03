import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'
import { api } from '../../api/client'
import RecaptchaCheck from '../../components/RecaptchaCheck'
import logo from '../../assets/enrolink-logo 2.png'
import illo from '../../assets/Users-People-Protect-privacy-01.png'
import GoogleSignIn from '../../components/GoogleSignIn'
import { useAuth } from '../../hooks/useAuth'

export default function OfficerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login({ email, password, captcha })
      const role = String(res.role || '').toUpperCase()
      if (role === 'DEPT_HEAD') navigate('/head/dashboard')
      else navigate('/officer/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Officer Login" illustration={illo} logo={logo} greetings="Good to see you, Enrollment Officer">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        <GoogleSignIn
          onSuccess={async (idToken) => {
            try {
              const res = await api.google({ idToken })
              localStorage.setItem('token', res.token)
              const role = String(res.role || '').toUpperCase()
              if (role === 'DEPT_HEAD') navigate('/head/dashboard')
              else navigate('/officer/dashboard')
            } catch (e) {
              setError(e.message)
            }
          }}
        />
        <div className="text-center text-xs text-[#5b5c60]">OR LOG IN WITH EMAIL</div>
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required
            className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required
            className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <RecaptchaCheck onChange={setCaptcha} />
        <button disabled={loading || !captcha} className="w-full bg-[#8a1d35] text-white rounded-md py-2 disabled:opacity-50">{loading? 'Logging in...' : 'Log in'}</button>
        <div className="flex justify-between text-sm">
          <Link to="/login" className="text-[#8a1d35] hover:underline">Main login</Link>
          <Link to="/forgot-password" className="text-[#8a1d35] hover:underline">forgot your password?</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
