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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-[#f7f1f2] px-10 py-8 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">ARCHIVE</h1>
            <p className="text-lg text-[#2f2b33] mt-3">Welcome to archive.</p>
          </div>
        </div>
        {error && (<div className="text-sm text-red-700 mb-2">{error}</div>)}
        <div className="bg-white rounded-3xl border border-[#efccd2] p-0 overflow-hidden">
          <div className="bg-[#e9a9b6] text-white font-semibold px-6 py-3">Archived Items</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left">Date</th>
                  <th className="py-2 px-3 text-left">Type</th>
                  <th className="py-2 px-3 text-left">Name</th>
                  <th className="py-2 px-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="py-4 px-3 text-center text-sm">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="4" className="py-4 px-3 text-center text-sm">No archived items</td></tr>
                ) : items.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3">{it.date ? new Date(it.date).toLocaleDateString() : '-'}</td>
                    <td className="py-2 px-3">{it.type}</td>
                    <td className="py-2 px-3">{it.name}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => restore(it)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-3 py-1 rounded-full hover:bg-pink-50 transition-colors duration-200 text-xs">Restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
