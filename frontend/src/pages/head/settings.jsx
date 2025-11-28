import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

export default function Settings() {
  const { isAuthenticated, user, token } = useAuth()
  const api = useApi(token)
  const [profile, setProfile] = useState({ name: '', firstName: '', lastName: '', email: '', department: '', phone: '' })
  const [prefs, setPrefs] = useState({ notifEmail: true, notifSms: false, notifInterview: true, notifSystem: true })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setErr(''); setMsg('')
        const res = await api.get('/auth/me')
        const u = res.user || {}
        if (mounted) {
          const nm = (u.name || '').trim()
          const parts = nm.split(/\s+/)
          const firstName = parts[0] || ''
          const lastName = parts.slice(1).join(' ') || ''
          setProfile({ name: nm, firstName, lastName, email: u.email || '', department: u.department || '', phone: u.phone || '' })
          setPrefs({ notifEmail: !!u.notifEmail, notifSms: !!u.notifSms, notifInterview: !!u.notifInterview, notifSystem: !!u.notifSystem })
        }
      } catch (e) { if (mounted) setErr(e.message) }
    }
    if (token) load()
    return () => { mounted = false }
  }, [api, token])

  async function saveProfile() {
    try {
      setSavingProfile(true); setErr(''); setMsg('')
      const name = `${(profile.firstName||'').trim()} ${(profile.lastName||'').trim()}`.trim() || profile.name
      const res = await api.put('/auth/me', { name, department: profile.department, phone: profile.phone })
      const nm = res.user?.name || name
      const parts = (nm||'').split(/\s+/)
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ') || ''
      setProfile(p => ({ ...p, name: nm, firstName, lastName, department: res.user?.department || p.department, phone: res.user?.phone || p.phone }))
      setMsg('Personal information updated')
    } catch (e) { setErr(e.message) } finally { setSavingProfile(false) }
  }

  async function savePrefs() {
    try {
      setSavingPrefs(true); setErr(''); setMsg('')
      await api.put('/auth/me', prefs)
      setMsg('Notification preferences saved')
    } catch (e) { setErr(e.message) } finally { setSavingPrefs(false) }
  }

  async function changePassword() {
    try {
      setChangingPw(true); setErr(''); setMsg('')
      await api.post('/auth/change-password', pw)
      setMsg('Password updated')
      setPw({ currentPassword: '', newPassword: '' })
    } catch (e) { setErr(e.message) } finally { setChangingPw(false) }
  }

  async function exportData() {
    try {
      setErr(''); setMsg('')
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/export`, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'enrolink-account-export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) { setErr('Failed to export') }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-[#f7f1f2] px-10 py-8 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">SETTINGS</h1>
            <p className="text-lg text-[#2f2b33] mt-3">Manage your account and preferences</p>
          </div>
          {/* <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 mt-[-30px] border-2 border-[#6b2b2b]">
            <button onClick={exportData} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Export My Data</button>
          </div> */}
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl border border-[#efccd2] p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-700">Last Name</label>
                <input value={profile.lastName} onChange={(e)=>setProfile(p=>({...p,lastName:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-700">First Name</label>
                <input value={profile.firstName} onChange={(e)=>setProfile(p=>({...p,firstName:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Email Address</label>
              <input value={profile.email} readOnly className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Department</label>
              <input value={profile.department} onChange={(e)=>setProfile(p=>({...p,department:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Phone Number</label>
              <input value={profile.phone} onChange={(e)=>setProfile(p=>({...p,phone:e.target.value}))} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" />
            </div>
            <button onClick={saveProfile} disabled={savingProfile} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{savingProfile?'Saving…':'Update Personal Information'}</button>
          </section>

          <section className="bg-white rounded-3xl border border-[#efccd2] p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
            <Toggle label="Email Notifications" checked={prefs.notifEmail} onChange={v=>setPrefs(p=>({...p,notifEmail:v}))} />
            <Toggle label="SMS Notifications" checked={prefs.notifSms} onChange={v=>setPrefs(p=>({...p,notifSms:v}))} />
            <Toggle label="Interview Updates" checked={prefs.notifInterview} onChange={v=>setPrefs(p=>({...p,notifInterview:v}))} />
            <Toggle label="System Alerts" checked={prefs.notifSystem} onChange={v=>setPrefs(p=>({...p,notifSystem:v}))} />
            <button onClick={savePrefs} disabled={savingPrefs} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{savingPrefs?'Saving…':'Save Notification Preferences'}</button>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <section className="bg-white rounded-3xl border border-[#efccd2] p-5 space-y-3">
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

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between border rounded-2xl px-3 py-2 border-[#cfa3ad]">
      <span className="text-sm text-[#7d102a]">{label}</span>
      <button type="button" onClick={()=>onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked?'bg-[#6b0000]':'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked?'translate-x-5':'translate-x-1'}`} />
      </button>
    </label>
  )
}
