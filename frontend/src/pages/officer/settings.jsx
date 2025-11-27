import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import OfficerSidebar from '../../components/OfficerSidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

export default function OfficerSettings() {
  const { isAuthenticated, user, token } = useAuth()
  const api = useApi(token)
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setErr(''); setMsg('')
        const res = await api.get('/auth/officer/me')
        const u = res.user || {}
        if (mounted) setProfile({ name: u.name || '', email: u.email || '' })
      } catch (e) { if (mounted) setErr(e.message) }
    }
    if (token) load()
    return () => { mounted = false }
  }, [api, token])

  async function saveProfile() {
    try {
      setSavingProfile(true); setErr(''); setMsg('')
      const res = await api.put('/auth/officer/me', { name: profile.name })
      setProfile(p => ({ ...p, name: res.user?.name || p.name }))
      setMsg('Personal information updated')
    } catch (e) { setErr(e.message) } finally { setSavingProfile(false) }
  }

  async function changePassword() {
    try {
      setChangingPw(true); setErr(''); setMsg('')
      await api.post('/auth/officer/change-password', pw)
      setMsg('Password updated')
      setPw({ currentPassword: '', newPassword: '' })
    } catch (e) { setErr(e.message) } finally { setChangingPw(false) }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'OFFICER') return <Navigate to="/" replace />

  return (
    <div className="flex">
      <OfficerSidebar />
      <main className="flex-1 bg-gray-50 px-8 pt-8 pb-4 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold text-red-900 mb-2 mt-[35px]">SETTINGS</h1>
            <p className="text-lg text-gray-1000 font-bold mt-[20px]">Manage your officer account</p>
          </div>
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl border border-pink-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Full Name</label>
              <input value={profile.name} onChange={(e)=>setProfile(p=>({...p,name:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Email Address</label>
              <input value={profile.email} readOnly className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <button onClick={saveProfile} disabled={savingProfile} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{savingProfile?'Saving…':'Update Personal Information'}</button>
          </section>

          <section className="bg-white rounded-xl border border-pink-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Security Settings</h2>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Current Password</label>
              <input type="password" value={pw.currentPassword} onChange={(e)=>setPw(p=>({...p,currentPassword:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">New Password</label>
              <input type="password" value={pw.newPassword} onChange={(e)=>setPw(p=>({...p,newPassword:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <button onClick={changePassword} disabled={changingPw || !pw.currentPassword || !pw.newPassword} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{changingPw?'Updating…':'Update Password'}</button>
          </section>
        </div>
      </main>
    </div>
  )
}
