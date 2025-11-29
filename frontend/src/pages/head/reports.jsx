import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { getStatusBadge, toUiStatus } from '../../utils/status'

export default function Reports() {
  const { isAuthenticated, user, token } = useAuth()
  const api = useApi(token)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [batch, setBatch] = useState('')
  const [query, setQuery] = useState('')
  const [batches, setBatches] = useState([])
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true); setError('')
        const res = await api.get(`/reports${batch ? `?batch=${encodeURIComponent(batch)}` : ''}`)
        const list = (res.rows || []).map(r => ({
          id: r._id || r.id,
          name: r.studentName || '-',
          batch: r.batch || '-',
          date: r.date ? new Date(r.date).toLocaleDateString() : '-',
          result: r.result || 'PENDING',
          examScore: typeof r.examScore === 'number' ? r.examScore : (r.examScore || '-'),
          interviewer: r.interviewerName || '-'
        }))
        if (mounted) setRows(list)
      } catch (e) { if (mounted) setError(e.message || 'Failed to load') }
      finally { if (mounted) setLoading(false) }
    }
    load();
    return () => { mounted = false }
  }, [api, batch])

  // Preload batches on mount so the select has data
  useEffect(() => {
    let active = true
    async function loadBatches() {
      try {
        const res = await api.get('/batches')
        if (active) setBatches(res.rows || [])
      } catch (_) { if (active) setBatches([]) }
    }
    loadBatches()
    return () => { active = false }
  }, [api])

  

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => (
      r.name.toLowerCase().includes(q) ||
      String(r.examScore ?? '').toLowerCase().includes(q) ||
      r.result.toLowerCase().includes(q) ||
      r.batch.toLowerCase().includes(q) ||
      (r.interviewer || '').toLowerCase().includes(q)
    ))
  }, [rows, query])

  const displayed = useMemo(() => {
    const arr = filtered.slice()
    arr.sort((a,b) => {
      let av = ''
      let bv = ''
      if (sortField === 'name') { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase() }
      else if (sortField === 'batch') { av = (a.batch || '').toLowerCase(); bv = (b.batch || '').toLowerCase() }
      else if (sortField === 'date') { av = a.date || ''; bv = b.date || '' }
      else if (sortField === 'officer') { av = (a.interviewer || '').toLowerCase(); bv = (b.interviewer || '').toLowerCase() }
      else if (sortField === 'result') { av = (a.result || '').toLowerCase(); bv = (b.result || '').toLowerCase() }
      else if (sortField === 'score') { av = String(a.examScore ?? ''); bv = String(b.examScore ?? '') }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortField, sortDir])

  const onPrint = () => {
    window.print()
  }
  const onDownloadPdf = async () => {
    try {
      const qs = batch ? `?batch=${encodeURIComponent(batch)}` : ''
      const res = await fetch(`/api/reports/pdf${qs}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'interview-report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (_) {
      window.alert('Failed to download PDF')
    }
  }

  async function refresh() {
    try {
      setLoading(true); setError('')
      const res = await api.get(`/reports${batch ? `?batch=${encodeURIComponent(batch)}` : ''}`)
      const list = (res.rows || []).map(r => ({
        id: r._id || r.id,
        name: r.studentName || '-',
        batch: r.batch || '-',
        date: r.date ? new Date(r.date).toLocaleDateString() : '-',
        result: r.result || 'PENDING',
        examScore: typeof r.examScore === 'number' ? r.examScore : (r.examScore || '-'),
        interviewer: r.interviewerName || '-'
      }))
      setRows(list)
    } catch (e) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  // read-only: no row mutations

  // read-only: no add/edit

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-80 shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 bg-[#fff6f7] px-10 pt-12 pb-10 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.4em] text-sm text-rose-400">Records</p>
            <h1 className="text-4xl font-semibold text-[#5b1a30]">Reports</h1>
            <p className="text-sm text-[#8b4a5d]">Interview Results and Exam Scores</p>
          </div>
          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl px-4 py-3 flex items-center gap-3 border-2 border-[#6b2b2b] shadow-[0_14px_28px_rgba(139,23,47,0.08)]">
            <button onClick={onDownloadPdf} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Download PDF</button>
            <button onClick={onPrint} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Print</button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name / score / result / batch" className="bg-white border border-rose-200 rounded-full px-4 py-2 text-sm text-[#4b1d2d] w-64 focus:border-rose-400 focus:outline-none" />
          <input value={batch} onChange={(e)=>setBatch(e.target.value)} placeholder="Filter by batch (YYYY)" className="bg-white border border-rose-200 rounded-full px-4 py-2 text-sm text-[#4b1d2d] w-48 focus:border-rose-400 focus:outline-none" />
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-rose-200 overflow-auto shadow-[0_12px_24px_rgba(139,23,47,0.08)]">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-rose-50 text-[#4b1d2d]">
              <tr className="text-left">
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='name' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'name')))}>Student Name</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='batch' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'batch')))}>Batch</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='officer' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'officer')))}>Enrollment Officer</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='date' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'date')))}>Interview Date</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='result' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'result')))}>Interview Result</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='score' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'score')))}>Exam Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-4 text-center">Loading…</td></tr>
              ) : filtered.length ? (
                displayed.map((r, idx) => (
                  <tr key={r.id || idx} className="border-t border-rose-100">
                    <td className="px-5 py-3 text-[#4b1d2d]">{r.name}</td>
                    <td className="px-5 py-3 text-[#4b1d2d]">{r.batch}</td>
                    <td className="px-5 py-3 text-[#4b1d2d]">{r.interviewer}</td>
                    <td className="px-5 py-3 text-[#4b1d2d]">{r.date}</td>
                    <td className="px-5 py-3"><span className={getStatusBadge(toUiStatus(r.result || ''))}>{toUiStatus(r.result || '')}</span></td>
                    <td className="px-5 py-3 text-[#4b1d2d]">{r.examScore ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-5 py-4 text-center text-[#7c3a4a]">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
