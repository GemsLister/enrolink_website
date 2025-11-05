import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { api } from '../api/client'
import RecaptchaCheck from '../components/RecaptchaCheck'
import logo from '../assets/enrolink-logo 2.png'
import illo from '../assets/Product-Newsletter-01.png'
import GoogleSignIn from '../components/GoogleSignIn'

export default function Signup() {
  const [search] = useSearchParams()
  const inviteToken = search.get('token') || ''
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Backend expects token, name, password. Email is implied by invite but we collect it to mirror design and for validation UX.
      const res = await api.signupWithInvite({ token: inviteToken, name, password, captcha })
      localStorage.setItem('token', res.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Please sign up to continue" illustration={illo} logo={logo}>
      <form onSubmit={onSubmit} className="space-y-4">
        {inviteToken ? null : (
          <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">Invitation token missing. Ask a Department Head for an invite link.</div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <GoogleSignIn
          onSuccess={async (idToken) => {
            try {
              const res = await api.google({ idToken, inviteToken })
              localStorage.setItem('token', res.token)
              navigate('/dashboard')
            } catch (e) {
              setError(e.message)
            }
          }}
        />
        <div className="text-center text-xs text-[#5b5c60]">OR SIGN UP WITH EMAIL</div>
        <div className="space-y-1">
          <label className="text-sm">Name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} required className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="(from invite)" disabled className="w-full border-b border-[#e2e2e2] bg-gray-50 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full border-b border-[#c8c8c8] focus:outline-none focus:border-[#8a1d35] py-2" />
        </div>
        <RecaptchaCheck onChange={setCaptcha} />
        <button disabled={loading || !inviteToken || !captcha} className="w-full bg-[#8a1d35] text-white rounded-md py-2 disabled:opacity-50">{loading? 'Signing up...' : 'Sign up'}</button>
        <div className="text-center text-sm"><Link className="text-[#8a1d35] hover:underline" to="/login">Back to Log in</Link></div>
      </form>
    </AuthLayout>
  )
}
