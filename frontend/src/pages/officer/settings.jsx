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
    <div className="min-h-screen flex bg-white">
      <OfficerSidebar />
      <main className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-y-auto">
        <div className="min-h-0 flex flex-col px-10 pt-10 pb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="uppercase tracking-[0.4em] text-xs text-rose-400">Records</p>
              <h1 className="text-4xl font-semibold text-[#5b1a30]">Settings</h1>
              <p className="text-base text-[#8b4a5d]">Manage your officer account and preferences</p>
            </div>
          </div>

          {err && <div className="rounded-2xl px-5 py-3 text-sm font-medium bg-[#F7D9D9] text-red-700">{err}</div>}
          {msg && <div className="rounded-2xl px-5 py-3 text-sm font-medium bg-emerald-100 text-emerald-700">{msg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-6 border border-[#f7d6d6] space-y-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Personal Information</h2>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Full Name</label>
                <input value={profile.name} onChange={(e)=>setProfile(p=>({...p,name:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full focus:border-black-400 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Email Address</label>
                <input value={profile.email} readOnly className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full opacity-60" />
              </div>
              <div className="flex justify-end">
                <button onClick={saveProfile} disabled={savingProfile} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60">{savingProfile?'Saving…':'Update Personal Information'}</button>
              </div>
            </section>

            <section className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-6 border border-[#f7d6d6] space-y-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Security Settings</h2>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Current Password</label>
                <input type="password" value={pw.currentPassword} onChange={(e)=>setPw(p=>({...p,currentPassword:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">New Password</label>
                <input type="password" value={pw.newPassword} onChange={(e)=>setPw(p=>({...p,newPassword:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
              </div>
              <div className="flex justify-end">
                <button onClick={changePassword} disabled={changingPw || !pw.currentPassword || !pw.newPassword} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60">{changingPw?'Updating…':'Update Password'}</button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
