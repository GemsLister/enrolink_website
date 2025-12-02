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
  const [officers, setOfficers] = useState([])
  const [selectedOfficerId, setSelectedOfficerId] = useState('')
  const [perms, setPerms] = useState({ validateRequirements: false, editProfiles: false, processEnrollment: false, manageSchedule: false, generateReports: false, viewRecordsAllPrograms: false })

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

  useEffect(() => {
    let active = true
    async function loadOfficers() {
      try {
        const res = await api.get('/officers')
        if (active) setOfficers(res.rows || [])
      } catch (_) { if (active) setOfficers([]) }
    }
    if (token) loadOfficers()
    return () => { active = false }
  }, [api, token])

  function selectOfficer(id) {
    setSelectedOfficerId(id)
    const o = officers.find(x => String(x._id || x.id) === String(id))
    const p = (o && o.permissions) || {}
    setPerms({
      validateRequirements: !!p.validateRequirements,
      editProfiles: !!p.editProfiles,
      processEnrollment: !!p.processEnrollment,
      manageSchedule: !!p.manageSchedule,
      generateReports: !!p.generateReports,
      viewRecordsAllPrograms: !!p.viewRecordsAllPrograms,
    })
  }

  async function saveOfficerPerms() {
    if (!selectedOfficerId) return
    try {
      setErr(''); setMsg('')
      const res = await api.patch(`/officers/${encodeURIComponent(selectedOfficerId)}`, { permissions: perms })
      setMsg('Permissions updated')
      setOfficers(prev => prev.map(o => String(o._id || o.id) === String(selectedOfficerId) ? { ...o, permissions: res.doc?.permissions || perms } : o))
    } catch (e) { setErr(e.message) }
  }

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
      try { localStorage.setItem('userProfile', JSON.stringify(res.user || { name: nm, email: profile.email, department: res.user?.department || p.department, phone: res.user?.phone || p.phone, role: 'DEPT_HEAD' })) } catch (_) {}
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
    <div className="min-h-screen flex bg-white">
      <Sidebar />
      <main className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-y-auto">
        <div className="min-h-0 flex flex-col px-10 pt-10 pb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="uppercase tracking-[0.4em] text-xs text-rose-400">Records</p>
              <h1 className="text-4xl font-semibold text-[#5b1a30]">Settings</h1>
              <p className="text-base text-[#8b4a5d]">Manage your account and preferences</p>
            </div>
          </div>

          {err && <div className="rounded-2xl px-5 py-3 text-sm font-medium bg-[#F7D9D9] text-red-700">{err}</div>}
          {msg && <div className="rounded-2xl px-5 py-3 text-sm font-medium bg-emerald-100 text-emerald-700">{msg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-6 border border-[#f7d6d6] space-y-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-[#5b1a30]">Last Name</label>
                  <input value={profile.lastName} onChange={(e)=>setProfile(p=>({...p,lastName:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-[#5b1a30]">First Name</label>
                  <input value={profile.firstName} onChange={(e)=>setProfile(p=>({...p,firstName:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Email Address</label>
                <input value={profile.email} readOnly className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full opacity-60" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Department</label>
                <input value={profile.department} onChange={(e)=>setProfile(p=>({...p,department:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Phone Number</label>
                <input value={profile.phone} onChange={(e)=>setProfile(p=>({...p,phone:e.target.value}))} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full" />
              </div>
              <div className="flex justify-end">
                <button onClick={saveProfile} disabled={savingProfile} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60">{savingProfile?'Saving…':'Update Personal Information'}</button>
              </div>
            </section>

            <section className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-6 border border-[#f7d6d6] space-y-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Notification Preferences</h2>
              <Toggle label="Email Notifications" checked={prefs.notifEmail} onChange={v=>setPrefs(p=>({...p,notifEmail:v}))} />
              <Toggle label="SMS Notifications" checked={prefs.notifSms} onChange={v=>setPrefs(p=>({...p,notifSms:v}))} />
              <Toggle label="Interview Updates" checked={prefs.notifInterview} onChange={v=>setPrefs(p=>({...p,notifInterview:v}))} />
              <Toggle label="System Alerts" checked={prefs.notifSystem} onChange={v=>setPrefs(p=>({...p,notifSystem:v}))} />
              <div className="flex justify-end">
                <button onClick={savePrefs} disabled={savingPrefs} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60">{savingPrefs?'Saving…':'Save Notification Preferences'}</button>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-6 border border-[#f7d6d6] space-y-4">
              <h2 className="text-sm font-bold text-[#7d102a]">Assign Roles and Permissions</h2>
              <div className="space-y-1">
                <label className="text-sm text-[#5b1a30]">Select Officer</label>
                <select value={selectedOfficerId} onChange={(e)=>selectOfficer(e.target.value)} className="bg-white border border-rose-200 rounded-full px-5 py-3 text-sm text-[#5b1a30] w-full">
                  <option value="">Choose an officer…</option>
                  {officers.map(o => (
                    <option key={String(o._id || o.id)} value={String(o._id || o.id)}>{o.name || o.email}</option>
                  ))}
                </select>
              </div>
              {selectedOfficerId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'validateRequirements', label: 'Validate requirements' },
                    { key: 'editProfiles', label: 'Encode/update profiles' },
                    { key: 'processEnrollment', label: 'Process enrollment (approve/return/hold)' },
                    { key: 'manageSchedule', label: 'Manage schedule and subjects' },
                    { key: 'generateReports', label: 'Generate enrollment reports' },
                    { key: 'viewRecordsAllPrograms', label: 'View records across programs' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between rounded-2xl px-4 py-3 border border-rose-200">
                      <span className="text-sm font-medium text-[#5b1a30]">{item.label}</span>
                      <button type="button" onClick={()=>setPerms(p=>({ ...p, [item.key]: !p[item.key] }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${perms[item.key]?'bg-[#c4375b]':'bg-gray-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${perms[item.key]?'translate-x-5':'translate-x-1'}`} />
                      </button>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={saveOfficerPerms} disabled={!selectedOfficerId} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49] disabled:opacity-60">Save Permissions</button>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl px-4 py-3 border border-rose-200">
      <span className="text-sm font-medium text-[#5b1a30]">{label}</span>
      <button type="button" onClick={()=>onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked?'bg-[#c4375b]':'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked?'translate-x-5':'translate-x-1'}`} />
      </button>
    </label>
  )
}
