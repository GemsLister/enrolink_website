import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useApi } from '../../../hooks/useApi'

export default function AddPassedStudentsModal({ isOpen, selectedBatch, onClose, onAdded }) {
  const { token } = useAuth()
  const api = useApi(token)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!isOpen) return
      try {
        setLoading(true)
        const sres = await api.get('/students')
        const all = (sres?.rows || []).map((s) => ({
          id: String(s._id || s.id || ''),
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          email: s.email || '',
          contact: s.contact || '',
          status: String(s.status || '').toUpperCase(),
          interviewerDecision: String(s.interviewerDecision || '').toUpperCase(),
          batchId: s.batchId ? String(s.batchId) : '',
          batch: s.batch || '',
          interviewDate: s.interviewDate || '',
        }))
        const passedOnly = all.filter((r) => r.interviewerDecision === 'PASSED' && r.batchId !== (selectedBatch?.id || ''))
        if (active) setRows(passedOnly)
      } catch (_) {
        if (active) setRows([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [isOpen, api, selectedBatch])

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (
      `${r.lastName}, ${r.firstName}`.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    ))
  }, [rows, query])

  const toggleRow = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  const toggleAll = (checked) => {
    setSelected((prev) => {
      if (!checked) return new Set()
      const next = new Set(prev)
      displayed.forEach((r) => next.add(r.id))
      return next
    })
  }

  const addSelected = async () => {
    if (!selectedBatch) return
    const ids = Array.from(selected)
    if (!ids.length) return
    try {
      for (const id of ids) {
        const s = rows.find((r) => r.id === id)
        if (!s) continue
        const payload = {
          firstName: s.firstName,
          lastName: s.lastName,
          status: 'PASSED',
          batchId: selectedBatch.id,
          batch: selectedBatch.year,
          interviewer: selectedBatch.interviewer || '',
          ...(s.email ? { email: s.email } : {}),
          ...(s.contact ? { contact: s.contact } : {}),
          ...(s.interviewDate ? { interviewDate: s.interviewDate } : {}),
        }
        await api.post('/students', payload)
      }
      setSelected(new Set())
      if (onAdded) onAdded()
      onClose()
    } catch (_) {}
  }

  if (!isOpen || !selectedBatch) return null
  const allSelected = displayed.length > 0 && displayed.every((r) => selected.has(r.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[900px] p-7 mx-auto border-2 border-[#6b2b2b]">
        <div className="mb-4 text-center text-[#6b2b2b] font-bold text-xl">Please choose from the list of available applicants:</div>
        <div className="flex items-center mb-3">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name / email" className="bg-white border border-rose-200 rounded-full px-4 py-2 text-sm text-[#4b1d2d] w-64 focus:border-rose-400 focus:outline-none" />
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 overflow-auto shadow-[0_12px_24px_rgba(139,23,47,0.08)]">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-rose-50 text-[#4b1d2d]">
              <tr className="text-left">
                <th className="px-5 py-3">
                  <input type="checkbox" className="rounded border-gray-300" checked={allSelected} onChange={(e)=>toggleAll(e.target.checked)} />
                </th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-gray-600">Loading…</td></tr>
              )}
              {!loading && displayed.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-gray-600">No passed applicants found</td></tr>
              )}
              {!loading && displayed.map((r, idx)=> (
                <tr key={r.id} className="border-t border-rose-100">
                  <td className="px-5 py-3"><input type="checkbox" className="rounded border-gray-300" checked={selected.has(r.id)} onChange={(e)=>toggleRow(r.id, e.target.checked)} /></td>
                  <td className="px-5 py-3 text-gray-800">{String(idx+1).padStart(2, '0')} {`${r.lastName}, ${r.firstName}`}</td>
                  <td className="px-5 py-3 text-gray-600">{r.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button onClick={addSelected} className="bg-[#6b0000] text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Add Selected</button>
          <button onClick={onClose} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-6 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
