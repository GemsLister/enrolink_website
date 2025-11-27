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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-gray-50 px-8 pt-8 pb-4 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold text-red-900 mb-2 mt-[35px]">REPORTS</h1>
            <p className="text-lg text-gray-1000 font-bold mt-[20px]">Interview Results and Exam Scores</p>
          </div>

          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 mt-[-50px] border-2 border-[#6b2b2b]">
            <button onClick={onDownloadPdf} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Download PDF</button>
            <button onClick={onPrint} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Print</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name / score / result / batch" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-64" />
          <input value={batch} onChange={(e)=>setBatch(e.target.value)} placeholder="Filter by batch (YYYY)" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-48" />
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="bg-white rounded-xl border border-pink-200 overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-pink-50 text-gray-700 print:bg-white">
              <tr className="text-left">
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='name' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'name')))}>Student Name</th>
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='batch' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'batch')))}>Batch</th>
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='officer' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'officer')))}>Enrollment Officer</th>
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='date' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'date')))}>Interview Date</th>
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='result' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'result')))}>Interview Result</th>
                <th className="px-4 py-2 cursor-pointer select-none" onClick={() => setSortField(prev => (prev==='score' ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), 'score')))}>Exam Score</th>
                
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-4 text-center">Loading…</td></tr>
              ) : filtered.length ? (
                displayed.map((r, idx) => (
                  <tr key={r.id || idx} className="border-t border-pink-100">
                    <td className="px-4 py-2 text-gray-800">{r.name}</td>
                    <td className="px-4 py-2 text-gray-800">{r.batch}</td>
                    <td className="px-4 py-2 text-gray-800">{r.interviewer}</td>
                    <td className="px-4 py-2 text-gray-800">{r.date}</td>
                    <td className="px-4 py-2"><span className={getStatusBadge(toUiStatus(r.result || ''))}>{toUiStatus(r.result || '')}</span></td>
                    <td className="px-4 py-2 text-gray-800">{r.examScore ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-600">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
      </main>
    </div>
  )
}
