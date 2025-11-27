import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

export default function Settings() {
  const { isAuthenticated, user, token } = useAuth()
  const api = useApi(token)
  const [profile, setProfile] = useState({ name: '', email: '', department: '', phone: '' })
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
          setProfile({ name: u.name || '', email: u.email || '', department: u.department || '', phone: u.phone || '' })
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
      const res = await api.put('/auth/me', { name: profile.name, department: profile.department, phone: profile.phone })
      setProfile(p => ({ ...p, name: res.user?.name || p.name, department: res.user?.department || p.department, phone: res.user?.phone || p.phone }))
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
      <main className="flex-1 bg-gray-50 px-8 pt-8 pb-4 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold text-red-900 mb-2 mt-[35px]">SETTINGS</h1>
            <p className="text-lg text-gray-1000 font-bold mt-[20px]">Manage your account and preferences</p>
          </div>
          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 mt-[-50px] border-2 border-[#6b2b2b]">
            <button onClick={exportData} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Export My Data</button>
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

          <section className="bg-white rounded-xl border border-pink-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
            <Toggle label="Email Notifications" checked={prefs.notifEmail} onChange={v=>setPrefs(p=>({...p,notifEmail:v}))} />
            <Toggle label="SMS Notifications" checked={prefs.notifSms} onChange={v=>setPrefs(p=>({...p,notifSms:v}))} />
            <Toggle label="Interview Updates" checked={prefs.notifInterview} onChange={v=>setPrefs(p=>({...p,notifInterview:v}))} />
            <Toggle label="System Alerts" checked={prefs.notifSystem} onChange={v=>setPrefs(p=>({...p,notifSystem:v}))} />
            <button onClick={savePrefs} disabled={savingPrefs} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{savingPrefs?'Saving…':'Save Notification Preferences'}</button>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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

          <section className="bg-white rounded-xl border border-pink-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Account Actions</h2>
            <div className="border rounded-xl p-3 bg-amber-50 border-amber-200">
              <div className="font-medium mb-1">Export Data</div>
              <div className="text-sm text-amber-700 mb-2">Download all your account data in a portable format.</div>
              <button onClick={exportData} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Export My Data</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between border rounded px-3 py-2">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={()=>onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked?'bg-blue-600':'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked?'translate-x-5':'translate-x-1'}`} />
      </button>
    </label>
  )
}
