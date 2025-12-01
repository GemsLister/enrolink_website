import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api/client'

export default function ArchivePage() {
  const { isAuthenticated, user, token } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoading(true); setError('')
        const [officersRes, batchesRes] = await Promise.all([
          api.officersArchivedList(token),
          api.batchesArchivedList(token)
        ])
        if (!alive) return
        const officerRows = Array.isArray(officersRes?.rows) ? officersRes.rows : []
        const batchRows = Array.isArray(batchesRes?.rows) ? batchesRes.rows : []
        const merged = [
          ...officerRows.map(o => ({ id: o._id, type: 'Officer', name: o.name || o.email || '-', date: o.archivedAt || o.updatedAt || o.createdAt })),
          ...batchRows.map(b => ({ id: b.id || b._id, type: 'Batch', name: b.code || '-', date: b.archivedAt || b.updatedAt || b.createdAt }))
        ]
        setItems(merged.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)))
      } catch (e) { if (alive) { setItems([]); setError(e.message || 'Failed to load archive') } }
      finally { if (alive) setLoading(false) }
    }
    if (token) load()
    return () => { alive = false }
  }, [token])

  async function restore(item) {
    try {
      setError('')
      if (item.type === 'Officer') await api.officerRestore(token, item.id)
      else if (item.type === 'Batch') await api.batchRestore(token, item.id)
      setItems(prev => prev.filter(x => x.id !== item.id))
    } catch (e) { setError(e.message || 'Failed to restore') }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden">
        <div className="h-full flex flex-col px-10 pt-10 pb-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-[0.25em] text-sm text-[#5b1a30]">Records</div>
              <h1 className="text-5xl font-bold text-red-900 mb-2 mt-1">Archive</h1>
              <p className="text-base text-[#5b1a30]">Archived officers and batches</p>
            </div>
            <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 border-2 border-[#6b2b2b]">
              <button type="button" className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#2f2b33] border border-[#efccd2]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
              </button>
              <span className="h-5 w-px bg-[#e4b7bf]" />
              <span className="text-gray-800 font-medium inline-flex items-center gap-1">Santiago Garcia <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span>
            </div>
          </div>
          {error && (<div className="text-sm text-red-700 mb-2">{error}</div>)}
          <div className="w-full max-w-sm">
            <input
              type="text"
              placeholder="Search name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-rose-200 bg-white px-5 py-3 text-sm text-[#5b1a30] placeholder:text-black-300 focus:border-black-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[#7d102a] font-semibold text-sm">Archived Items</span>
          </div>
          <div className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] overflow-hidden border border-[#f7d6d6]">
            <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
            <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-[1800px] border-collapse">
                <thead>
                  <tr className="bg-[#f9c4c4] text-[#5b1a30] text-xs font-semibold uppercase">
                    <th className="py-4 px-5 text-left sticky top-0 z-20 bg-[#f9c4c4]">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Date</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 text-left sticky top-0 z-20 bg-[#f9c4c4]">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Type</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 text-left sticky top-0 z-20 bg-[#f9c4c4]">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Name</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 text-left sticky top-0 z-20 bg-[#f9c4c4]">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>Action</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="py-4 px-3 text-center text-sm">Loading…</td></tr>
                  ) : items
                    .filter((it) => {
                      const q = (query || '').toLowerCase().trim()
                      if (!q) return true
                      return (
                        (it.name || '').toLowerCase().includes(q) ||
                        (it.type || '').toLowerCase().includes(q)
                      )
                    })
                    .length === 0 ? (
                    <tr><td colSpan="4" className="py-4 px-3 text-center text-sm">No archived items</td></tr>
                  ) : items
                    .filter((it) => {
                      const q = (query || '').toLowerCase().trim()
                      if (!q) return true
                      return (
                        (it.name || '').toLowerCase().includes(q) ||
                        (it.type || '').toLowerCase().includes(q)
                      )
                    })
                    .map((it, idx) => (
                  <tr key={it.id} className={`border-b border-[#f3d5d5] hover:bg-rose-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fff2f4]'}`}>
                    <td className="py-3 px-5 text-[#7c3a4a]">{it.date ? new Date(it.date).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-5 text-[#7c3a4a]">{it.type}</td>
                    <td className="py-3 px-5 text-[#5b1a30]">{it.name}</td>
                    <td className="py-3 px-5">
                      <button onClick={() => restore(it)} className="rounded-full bg-white border border-rose-200 px-3 py-1 text-xs font-semibold text-[#6b0000] hover:bg-rose-50">Restore</button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
