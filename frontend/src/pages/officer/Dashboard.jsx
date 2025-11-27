import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import OfficerSidebar from '../../components/OfficerSidebar'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api/client'
import CalendarGrid from '../../components/CalendarGrid'
import ScheduleCreateModal from '../../components/ScheduleCreateModal'

function PlaceholderIcon({ size = 'w-11 h-11', variant = 'primary', label = 'icon' }) {
  const styles = {
    primary: 'bg-[#f2c6cf] text-[#8a1d35]',
    secondary: 'bg-[#f0d9dd] text-[#b0475c]',
    ghost: 'bg-white text-[#b0475c] border border-[#efccd2]',
  }
  return (
    <div className={`flex items-center justify-center rounded-full font-semibold uppercase tracking-[0.2em] text-[10px] ${size} ${styles[variant]}`}>
      {label}
    </div>
  )
}

function getStartYearOptions() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current + 1; y >= current - 6; y--) years.push(String(y))
  return years
}
function formatSY(startYear) {
  const a = Number(startYear)
  if (!a) return 'S.Y. —'
  return `S.Y. ${a}-${a + 1}`
}

function timeAgo(input) {
  const t = new Date(input).getTime()
  if (!t) return ''
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return 'a while ago'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

export default function OfficerDashboard() {
  const { isAuthenticated, user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ totals: null, batchAnalytics: [] })
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()))
  const [searchQuery, setSearchQuery] = useState('')
  const [activities, setActivities] = useState([])
  const [gcal, setGcal] = useState([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const data = await api.dashboardStats(token, startYear)
        if (!alive) return
        setStats({
          totals: data?.totals || null,
          batchAnalytics: Array.isArray(data?.batchAnalytics) ? data.batchAnalytics : [],
        })
      } catch (err) {
        if (!alive) return
        setError(err.message || 'Unable to load dashboard data')
        setStats({ totals: null, batchAnalytics: [] })
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [token, startYear])

  useEffect(() => {
    let alive = true
    async function loadActivity() {
      if (!token) return
      try {
        const data = await api.dashboardActivity(token, startYear)
        if (!alive) return
        setActivities(Array.isArray(data?.events) ? data.events : [])
      } catch (_) {
        if (!alive) return
        setActivities([])
      }
    }
    loadActivity()
    return () => { alive = false }
  }, [token, startYear])

  useEffect(() => {
    let alive = true
    async function loadCalendar() {
      if (!token) return
      const now = new Date()
      const timeMin = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      try {
        const data = await api.calendarEvents(token, { timeMin, timeMax })
        if (!alive) return
        const items = Array.isArray(data?.events) ? data.events : []
        items.sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0))
        setGcal(items.slice(0, 10))
      } catch (_) {
        if (!alive) return
        setGcal([])
      }
    }
    loadCalendar()
    return () => { alive = false }
  }, [token])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'OFFICER') return <Navigate to="/" replace />

  const totals = stats.totals || { totalApplicants: 0, interviewed: 0, passedInterview: 0, enrolled: 0, awol: 0 }
  const summaryCards = [
    { label: 'Total Applicant', value: totals.totalApplicants },
    { label: 'Interviewed', value: totals.interviewed },
    { label: 'Passed Interview', value: totals.passedInterview },
    { label: 'Enrolled', value: totals.enrolled },
    { label: 'AWOL', value: totals.awol },
  ]

  const batches = stats.batchAnalytics || []

  const passRate = useMemo(() => {
    const base = totals.interviewed || totals.totalApplicants || 0
    if (!base) return { passed: 0, failed: 100 }
    const passed = Math.min(100, Math.round((totals.passedInterview / base) * 100))
    const failed = Math.max(0, 100 - passed)
    return { passed, failed }
  }, [totals])

  async function refreshCalendar() {
    if (!token) return
    const now = new Date()
    const timeMin = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    try {
      const data = await api.calendarEvents(token, { timeMin, timeMax })
      const items = Array.isArray(data?.events) ? data.events : []
      items.sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0))
      setGcal(items.slice(0, 10))
    } catch (_) {
      setGcal([])
    }
  }

  async function deleteSchedule(id) {
    if (!token || !id) return
    try {
      await api.calendarDelete(token, id)
      await refreshCalendar()
    } catch (e) {
      setError(e.message || 'Failed to delete schedule')
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-80 shrink-0">
        <OfficerSidebar />
      </aside>
      <div className="flex-1 grid grid-cols-[1fr_360px]">
        <main className="bg-[#f7f1f2] px-10 py-8">
          <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">DASHBOARD</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-[#6e2a39]">
            <span>Showing for:</span>
            <select value={startYear} onChange={(e)=>setStartYear(e.target.value)} className="font-semibold bg-transparent text-[#6e2a39] border-none outline-none cursor-pointer underline decoration-[#6e2a39]/30 decoration-2">
              {getStartYearOptions().map(yr => (
                <option key={yr} value={yr} className="text-[#6e2a39]">{formatSY(yr)}</option>
              ))}
            </select>
          </p>
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card, idx) => (
              <div key={card.label} className="rounded-xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(139,23,47,0.08)] border border-[#efccd2] flex flex-col items-center justify-between overflow-hidden h-40">
                <PlaceholderIcon variant={idx % 2 === 0 ? 'primary' : 'secondary'} />
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#a86a74] leading-4 text-center break-words whitespace-normal max-w-[8rem]">{card.label}</div>
                {loading ? (<div className="h-3 w-10 rounded bg-[#f3d9de] animate-pulse" />) : (<span className="text-2xl font-extrabold text-[#7d102a]">{Number.isFinite(card.value) ? card.value : 0}</span>)}
              </div>
            ))}
          </section>
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
              <h2 className="text-sm font-bold text-[#7d102a]">Batch Analytics</h2>
              <div className="mt-5 space-y-3">
                {batches.length === 0 && (<div className="text-sm text-[#a86a74]">No data for the selected school year.</div>)}
                {batches.map((batch) => {
                  const max = Math.max(...batches.map(b => b.count ?? b.value ?? 0), 1)
                  const count = batch.count ?? batch.value ?? 0
                  const pct = Math.round((count / max) * 100)
                  return (
                    <div key={batch.code || batch.name} className="flex items-center gap-3">
                      <span className="w-[64px] text-[12px] font-semibold text-[#7d102a]">{batch.code || batch.name}</span>
                      <div className="flex-1 h-3 rounded-full bg-[#f0dce0] overflow-hidden"><div className="h-full rounded-full bg-[#8a1d35]" style={{ width: `${pct}%` }} /></div>
                      <span className="w-9 text-right text-[12px] font-semibold text-[#7d102a]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-[0_12px_24px_rgba(139,23,47,0.08)] border border-[#efccd2]">
              <h2 className="text-sm font-bold text-[#7d102a]">Percentage: Pass Rates</h2>
              <div className="mt-6 flex flex-col items-center gap-5">
                <div className="relative flex items-center justify-center rounded-full" style={{ width:'220px', height:'220px', background:`conic-gradient(#7d102a 0% ${passRate.failed}%, #f4c3ce ${passRate.failed}% 100%)` }}>
                  <div className="absolute flex h-[150px] w-[150px] flex-col items-center justify-center rounded-full bg-white text-center border border-[#efccd2]">
                    <span className="text-4xl font-extrabold text-[#7d102a]">{passRate.passed}%</span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#a86a74]">Passed</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-[#7d102a]">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#7d102a]" /><span>Failed {passRate.failed}%</span></div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#f4c3ce]" /><span>Passed {passRate.passed}%</span></div>
                </div>
              </div>
            </div>
          </section>
          {/* Google Calendar UI */}
          <section className="mt-6">
            <CalendarGrid />
          </section>
          {/* Add schedule CTA */}
          <div className="mt-4 flex justify-end">
            <button onClick={() => setShowScheduleModal(true)} className="h-9 rounded-md bg-[#8a1d35] text-white text-[13px] font-semibold px-4">Add schedule</button>
          </div>
          {error && (<div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>)}
          {showScheduleModal && (
            <ScheduleCreateModal
              open={showScheduleModal}
              onClose={() => setShowScheduleModal(false)}
              onCreated={refreshCalendar}
            />
          )}
        </main>
        <aside className="border-l border-[#efccd2] bg-[#fbf3f4] px-6 py-8">
          {/* Simplified right column for officers; mirrors head */}
          <div className="rounded-3xl bg-gradient-to-b from-[#efc4cd] to-[#f5d8de] p-5 shadow-[0_14px_28px_rgba(139,23,47,0.08)]">
            <div className="flex items-center justify-between">
              <div className="relative" style={{ width: '220px' }}>
                <input
                  type="search"
                  placeholder="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-full bg-white pl-8 pr-3 text-[13px] text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none focus-visible:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
                />
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#8a1d35] border border-[#efccd2]">
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current">
                      <path d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                  </div>
                </span>
              </div>
            </div>
          </div>
          {/* Removed Add Schedule box */}
          <div className="mt-8">
            <h2 className="text-sm font-bold text-[#7d102a]">Schedules</h2>
            <div className="mt-4 flex flex-col gap-3 pr-2 max-h-[320px] overflow-y-auto">
              {gcal.length === 0 && (<div className="text-sm text-[#a86a74]">No schedules.</div>)}
              {gcal.map(ev => {
                const when = ev.start?.dateTime || ev.start?.date
                const dt = when ? new Date(when) : null
                return (
                  <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_18px_rgba(139,23,47,0.08)] border border-[#efccd2]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full font-semibold uppercase tracking-[0.2em] text-[10px] w-12 h-12 bg-white text-[#b0475c] border border-[#efccd2]">icon</div>
                      <div className="text-sm leading-relaxed text-[#7d102a]">
                        <p className="font-semibold">{ev.summary || 'Untitled Event'}</p>
                        <p className="text-xs text-[#a86a74]">{dt ? dt.toLocaleString() : ''}</p>
                      </div>
                    </div>
                    {!ev.htmlLink && (
                      <button
                        onClick={() => { if (window.confirm('Delete this schedule?')) deleteSchedule(ev.id) }}
                        className="ml-2 rounded-full border border-[#efccd2] text-[#7d102a] hover:bg-[#f8e7eb] px-3 py-1 text-xs"
                        title="Delete schedule"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-sm font-bold text-[#7d102a]">Recent Activity</h2>
            <div className="mt-4 flex flex-col gap-4 pr-2 max-h-[560px] overflow-y-auto">
              {activities
                .filter((a) => {
                  const q = searchQuery.trim().toLowerCase()
                  if (!q) return true
                  return a.actor.toLowerCase().includes(q) || a.action.toLowerCase().includes(q)
                })
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_18px_rgba(139,23,47,0.08)] border border-[#efccd2]"
                  >
                    <div className="flex items-center justify-center rounded-full font-semibold uppercase tracking-[0.2em] text-[10px] w-12 h-12 bg-[#f0d9dd] text-[#b0475c]">
                      icon
                    </div>
                    <div className="text-sm leading-relaxed text-[#7d102a]">
                      <p>
                        <span className="font-semibold">{activity.actor}</span> {activity.action}
                      </p>
                      <p className="text-xs text-[#a86a74]">{new Date(activity.when).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
