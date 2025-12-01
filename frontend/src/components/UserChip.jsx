import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'

export default function UserChip() {
  const { user, token } = useAuth()
  const [open, setOpen] = useState(false)
  const overlayRef = useRef(null)
  const [dbName, setDbName] = useState('')
  const [assignedLabel, setAssignedLabel] = useState('')
  const [assignedUpdated, setAssignedUpdated] = useState(false)
  const [recentAcceptances, setRecentAcceptances] = useState([])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return
      const target = e.target
      const inside = overlayRef.current && overlayRef.current.contains(target)
      if (!inside) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    try {
      const label = localStorage.getItem('assigned_batch_label') || ''
      const updated = localStorage.getItem('assigned_batch_updated') === '1'
      setAssignedLabel(label)
      setAssignedUpdated(updated)
    } catch (_) {}
  }, [])

  useEffect(() => {
    let alive = true
    async function loadProfileAndAcceptances() {
      try {
        if (!token) return
        try {
          const mePath = user?.role === 'OFFICER' ? '/auth/officer/me' : '/auth/me'
          const meRes = await api.request('GET', mePath, { token })
          const nm = (meRes?.user?.name || '').trim()
          if (alive && nm) setDbName(nm)
        } catch (_) {}
        const res = await api.officersList(token)
        const rows = Array.isArray(res?.rows) ? res.rows : []
        if (user?.email) {
          const me = rows.find(o => String(o.email || '').toLowerCase() === String(user.email || '').toLowerCase())
          if (alive && me && me.name && !dbName) setDbName(String(me.name))
        }
        const now = Date.now()
        const recent = rows
          .filter(o => {
            const t = new Date(o.createdAt || 0).getTime()
            if (!t) return false
            const diffDays = (now - t) / (1000 * 60 * 60 * 24)
            return diffDays <= 7
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        if (alive) setRecentAcceptances(recent)
      } catch (_) {}
    }
    loadProfileAndAcceptances()
    return () => { alive = false }
  }, [token, user])

  useEffect(() => {
    if (open) {
      ;(async () => {
        try {
          if (!token) return
          const mePath = user?.role === 'OFFICER' ? '/auth/officer/me' : '/auth/me'
          const meRes = await api.request('GET', mePath, { token })
          const nm = (meRes?.user?.name || '').trim()
          if (nm) setDbName(nm)
        } catch (_) {}
      })()
    }
  }, [open, token, user])

  const displayName = (dbName || (user?.name || '')).trim() || 'Santiago Garcia'

  const toggleOpen = () => {
    setOpen(v => !v)
    try {
      if (assignedUpdated) localStorage.removeItem('assigned_batch_updated')
      setAssignedUpdated(false)
    } catch (_) {}
  }

  return (
    <div className="relative">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_18px_rgba(139,23,47,0.12)]">
        <button type="button" onClick={toggleOpen} className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#2f2b33] border border-[#efccd2]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
        </button>
        <span className="h-5 w-px bg-[#e4b7bf]" />
        <span className="text-gray-800 font-medium inline-flex items-center gap-1">{displayName} <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span>
      </div>
      {open && (
        <div ref={overlayRef} className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#efccd2] bg-white shadow-2xl text-sm text-[#5b1a30] z-[1000]">
          <div className="px-4 py-2 border-b border-[#f3d9de] font-semibold text-xs text-[#7d102a]">Notifications</div>
          <ul className="max-h-64 overflow-auto py-1">
            {assignedLabel && (
              <>
                {assignedUpdated && (
                  <li className="px-4 py-2 flex items-start gap-3 hover:bg-[#fff5f7]">
                    <div className="w-7 h-7 rounded-full bg-[#f2c6cf] text-[#8a1d35] flex items-center justify-center text-[10px] font-semibold">UPD</div>
                    <div className="flex-1">
                      <div className="font-semibold">Batch updated</div>
                      <div className="text-xs text-[#8b4a5d]">You are now assigned to {assignedLabel}</div>
                    </div>
                  </li>
                )}
                <li className="px-4 py-2 flex items-start gap-3 hover:bg-[#fff5f7]">
                  <div className="w-7 h-7 rounded-full bg-[#f0d9dd] text-[#b0475c] flex items-center justify-center text-[10px] font-semibold">INF</div>
                  <div className="flex-1">
                    <div className="font-semibold">Assigned batch</div>
                    <div className="text-xs text-[#8b4a5d]">You are assigned to {assignedLabel}</div>
                  </div>
                </li>
              </>
            )}
            {recentAcceptances.length > 0 ? (
              recentAcceptances.map((o) => (
                <li key={o._id} className="px-4 py-2 flex items-start gap-3 hover:bg-[#fff5f7]">
                  <div className="w-7 h-7 rounded-full bg-[#f2c6cf] text-[#8a1d35] flex items-center justify-center text-[10px] font-semibold">OK</div>
                  <div className="flex-1">
                    <div className="font-semibold">{o.name || o.email || '-'}</div>
                    <div className="text-xs text-[#8b4a5d]">Accepted invite {(() => {
                      const t = new Date(o.createdAt || 0).getTime()
                      if (!t) return ''
                      const s = Math.floor((Date.now() - t) / 1000)
                      if (s < 60) return 'just now'
                      const m = Math.floor(s / 60)
                      if (m < 60) return `${m} min ago`
                      const h = Math.floor(m / 60)
                      if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
                      const d = Math.floor(h / 24)
                      return `${d} day${d > 1 ? 's' : ''} ago`
                    })()}</div>
                  </div>
                </li>
              ))
            ) : (!assignedLabel && (
              <li className="px-4 py-3 text-[#8c7f86]">No notifications yet</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
