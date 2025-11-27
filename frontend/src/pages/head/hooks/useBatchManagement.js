import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../../../hooks/useApi'
import { toUiStatus, toApiStatus } from '../../../utils/status'

export function useBatchManagement(token, opts = {}) {
  const { allowInterviewer = true } = opts
  const api = useApi(token)

  const [selectedBatch, setSelectedBatch] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addValues, setAddValues] = useState({ firstName: '', lastName: '', email: '', contact: '', interviewDate: '', status: 'Pending', examScore: '' })
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false)
  const [addBatchValues, setAddBatchValues] = useState({ year: String(new Date().getFullYear()), interviewer: '', status: 'PENDING' })
  const [addBatchLoading, setAddBatchLoading] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importValues, setImportValues] = useState({ url: '', year: String(new Date().getFullYear()) })
  const [importLoading, setImportLoading] = useState(false)
  const [importBatchId, setImportBatchId] = useState('')
  const [appendBatchId, setAppendBatchId] = useState('')
  const [importCreate, setImportCreate] = useState({ interviewer: '', status: 'PENDING' })
  const [importMode, setImportMode] = useState('sheets')
  const [csvFile, setCsvFile] = useState(null)

  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterBatch, setFilterBatch] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterInterviewer, setFilterInterviewer] = useState('All')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const batchOptions = useMemo(() => {
    const set = new Set((batches || []).map(b => b.year).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [batches])

  const statusOptions = useMemo(() => {
    const set = new Set((batches || []).map(b => b.status).filter(Boolean))
    const base = ['Passed','Failed','Pending']
    return ['All', ...Array.from(new Set([...base, ...Array.from(set)])).sort()]
  }, [batches])

  const interviewerOptions = useMemo(() => {
    const set = new Set((batches || []).map(b => b.interviewer).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [batches])

  const displayedBatches = useMemo(() => {
    let rows = batches.slice()
    if (filterBatch !== 'All') rows = rows.filter(b => (b.year || '') === filterBatch)
    if (filterStatus !== 'All') rows = rows.filter(b => (b.status || '') === filterStatus)
    if (filterInterviewer !== 'All') rows = rows.filter(b => (b.interviewer || '') === filterInterviewer)
    const q = debouncedQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter(s => (
        (s.code || '').toLowerCase().includes(q) ||
        (s.year || '').toLowerCase().includes(q) ||
        String(s.studentsCount ?? '').toLowerCase().includes(q) ||
        (s.interviewer || '').toLowerCase().includes(q) ||
        (s.status || '').toLowerCase().includes(q)
      ))
    }
 
    rows.sort((a,b) => {
      let av = ''
      let bv = ''
      if (sortField === 'name') { av = (a.code || '').toLowerCase(); bv = (b.code || '').toLowerCase() }
      else if (sortField === 'batch') { av = (a.year || '').toLowerCase(); bv = (b.year || '').toLowerCase() }
      else if (sortField === 'status') { av = (a.status || '').toLowerCase(); bv = (b.status || '').toLowerCase() }
      else if (sortField === 'interviewer') { av = (a.interviewer || '').toLowerCase(); bv = (b.interviewer || '').toLowerCase() }
      else if (sortField === 'date') { av = (a.createdAt || ''); bv = (b.createdAt || '') }
      else if (sortField === 'students') { av = String(a.studentsCount ?? ''); bv = String(b.studentsCount ?? '') }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [batches, filterBatch, filterStatus, filterInterviewer, debouncedQuery, sortField, sortDir])

  const allDisplayedSelected = useMemo(() => {
    if (!displayedBatches.length) return false
    for (const s of displayedBatches) {
      if (!selectedIds.has(s.id)) return false
    }
    return true
  }, [displayedBatches, selectedIds])

  const clearSelection = () => setSelectedIds(new Set())
  const toggleRow = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  const toggleAllDisplayed = (checked) => {
    setSelectedIds(prev => {
      if (!checked) return new Set()
      const next = new Set(prev)
      displayedBatches.forEach(s => next.add(s.id))
      return next
    })
  }
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    try {
      const cascade = window.confirm('Also delete students in these batches? Click OK to cascade delete.')
      for (const id of ids) {
        await api.del(`/batches/${id}${cascade ? '?cascade=true' : ''}`)
      }
      setBatches(prev => prev.filter(s => !selectedIds.has(s.id)))
      clearSelection()
    } catch (_) {}
  }

  const activeChips = useMemo(() => {
    const chips = []
    if (filterBatch !== 'All') chips.push(`Batch: ${filterBatch}`)
    if (filterStatus !== 'All') chips.push(`Status: ${filterStatus}`)
    if (filterInterviewer !== 'All') chips.push(`Interviewer: ${filterInterviewer}`)
    if (query.trim()) chips.push(`Search: ${query.trim()}`)
    const label = { name: 'Name', batch: 'Batch', date: 'Interview Date', interviewer: 'Interviewer', status: 'Status' }[sortField] || 'Name'
    chips.push(`Sort: ${label} (${sortDir === 'asc' ? 'Asc' : 'Desc'})`)
    return chips
  }, [filterBatch, filterStatus, filterInterviewer, query, sortField, sortDir])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setBatchesLoading(true)
        const res = await api.get('/batches')
        const rows = (res?.rows || []).map((b) => ({
          id: b.id,
          code: b.code,
          year: b.year,
          index: b.index,
          interviewer: b.interviewer || '',
          status: toUiStatus(b.status),
          studentsCount: b.studentsCount || 0,
          createdAt: b.createdAt || '',
        }))
        if (mounted) setBatches(rows)
      } catch (_) {} finally { if (mounted) setBatchesLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [api])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const handleRowClick = (batch) => {
    setSelectedBatch(batch)
    setIsModalOpen(true)
    setIsEditing(false)
    setFormValues(batch)
    setShowMembers(false)
    setMembers([])
    setShowAdd(false)
    setAddValues({ firstName: '', lastName: '', email: '', contact: '', interviewDate: '', status: 'Pending', examScore: '' })
  }
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedBatch(null)
    setIsEditing(false)
    setFormValues(null)
    setShowMembers(false)
    setMembers([])
    setShowAdd(false)
    setAddValues({ firstName: '', lastName: '', email: '', contact: '', interviewDate: '', status: 'Pending' })
  }
  const loadMembers = async (batchId) => {
    try {
      setMembersLoading(true)
      const res = await api.get(`/batches/${batchId}/students`)
      const rows = (res?.rows || []).map(s => ({
        id: String(s._id || s.id || ''),
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        status: toUiStatus(s.status || ''),
        email: s.email || '',
        contact: s.contact || '',
        interviewer: s.interviewer || '',
        interviewDate: s.interviewDate || '',
      }))
      setMembers(rows)
    } catch (_) {
      setMembers([])
    } finally { setMembersLoading(false) }
  }
  const handleAddBatch = () => {
    setIsAddBatchOpen(true)
    setAddBatchValues({ year: String(new Date().getFullYear()), interviewer: '', status: 'PENDING' })
  }
  const submitAddBatch = async () => {
    const year = (addBatchValues.year || '').trim()
    if (!year) return
    try {
      setAddBatchLoading(true)
      const payload = { year, interviewer: addBatchValues.interviewer || '', status: addBatchValues.status || 'PENDING' }
      const res = await api.post('/batches', payload)
      const b = res?.doc
      if (b) {
        const mapped = { id: String(b._id || b.id), code: b.code, year: b.year, index: b.index, interviewer: b.interviewer || '', status: toUiStatus(b.status), studentsCount: 0, createdAt: b.createdAt || '' }
        setBatches(prev => [mapped, ...prev])
        setIsAddBatchOpen(false)
      }
    } catch (_) {
    } finally { setAddBatchLoading(false) }
  }

  const submitAddBatchAndImport = async () => {
    const year = (addBatchValues.year || '').trim()
    if (!year) return
    try {
      setAddBatchLoading(true)
      const payload = { year, interviewer: addBatchValues.interviewer || '', status: addBatchValues.status || 'PENDING' }
      const res = await api.post('/batches', payload)
      const b = res?.doc
      if (b) {
        const mapped = { id: String(b._id || b.id), code: b.code, year: b.year, index: b.index, interviewer: b.interviewer || '', status: toUiStatus(b.status), studentsCount: 0, createdAt: b.createdAt || '' }
        setBatches(prev => [mapped, ...prev])
        setIsAddBatchOpen(false)
        // Open Import modal to append to this newly created batch
        setImportMode('sheets')
        setCsvFile(null)
        setImportValues({ url: '', year: String(mapped.year) })
        setImportBatchId(mapped.id)
        setAppendBatchId(mapped.id)
        setImportCreate({ interviewer: '', status: 'PENDING' })
        setIsImportOpen(true)
      }
    } catch (_) {
    } finally { setAddBatchLoading(false) }
  }

  const handleImport = () => {
    setIsImportOpen(true)
    // Default to Google Sheets, user can switch to Upload File in the modal.
    setImportMode('sheets')
    setCsvFile(null)
    const yr = String(new Date().getFullYear())
    // If exactly one batch is selected, append to that batch (pre-fill year and hide new batch fields)
    let targetId = ''
    if (selectedIds && selectedIds.size === 1) {
      targetId = Array.from(selectedIds)[0]
    }
    if (targetId) {
      const b = (batches || []).find(x => x.id === targetId)
      setImportValues({ url: '', year: String(b?.year || yr) })
      setImportBatchId(targetId)
      setAppendBatchId(targetId)
    } else {
      setImportValues({ url: '', year: yr })
      setImportBatchId('')
      setAppendBatchId('')
    }
    setImportCreate({ interviewer: '', status: 'PENDING' })
  }
  const openImportForBatch = (batch) => {
    if (!batch) return
    setIsModalOpen(false)
    setIsImportOpen(true)
    setImportMode('file')
    setCsvFile(null)
    setImportValues({ url: '', year: String(batch.year) })
    setImportBatchId(batch.id)
    setAppendBatchId(batch.id)
    setImportCreate({ interviewer: '', status: 'PENDING' })
  }
  const submitImport = async () => {
    const url = (importValues.url || '').trim()
    const year = (importValues.year || '').trim()
    let batchId = ''
    if (!url || !year) return
    try {
      setImportLoading(true)
      if (appendBatchId) batchId = appendBatchId
      else {
        const interviewerReq = (importCreate.interviewer || '').trim()
        if (allowInterviewer && !interviewerReq) { setImportLoading(false); return }
        const payload = { year, interviewer: interviewerReq, status: toApiStatus(importCreate.status) }
        const created = await api.post('/batches', payload)
        batchId = created?.doc?.id || created?.doc?._id || ''
        if (!batchId) throw new Error('Failed to create batch')
      }
      const resp = await api.post('/sheets/import', { url, batch: year, batchId })
      const res = await api.get('/batches')
      const rows = (res?.rows || []).map((b) => ({ id: b.id, code: b.code, year: b.year, index: b.index, interviewer: b.interviewer || '', status: toUiStatus(b.status), studentsCount: b.studentsCount || 0, createdAt: b.createdAt || '' }))
      setBatches(rows)
      setIsImportOpen(false)
      const imported = Number(resp?.imported || 0)
      if (!Number.isNaN(imported)) window.alert(`Imported ${imported} students from Google Sheets`)
    } catch (_) {
    } finally { setImportLoading(false) }
  }

  const submitImportCsv = async () => {
    if (!csvFile) return
    const year = (importValues.year || '').trim()
    let batchId = ''
    if (!year) return
    try {
      setImportLoading(true)
      if (appendBatchId) batchId = appendBatchId
      else {
        const interviewerReq = (importCreate.interviewer || '').trim()
        if (allowInterviewer && !interviewerReq) { setImportLoading(false); return }
        const payloadNew = { year, interviewer: interviewerReq, status: toApiStatus(importCreate.status) }
        const created = await api.post('/batches', payloadNew)
        batchId = created?.doc?.id || created?.doc?._id || ''
        if (!batchId) throw new Error('Failed to create batch')
      }
      const name = (csvFile.name || '').toLowerCase()
      let success = 0
      const interviewer = appendBatchId ? (batches.find(b=>b.id===appendBatchId)?.interviewer || '') : (importCreate.interviewer || '')
      if (name.endsWith('.xlsx')) {
        const loadXLSX = () => new Promise((resolve, reject) => {
          if (window && window.XLSX) return resolve(window.XLSX)
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
          s.async = true
          s.onload = () => resolve(window.XLSX)
          s.onerror = () => reject(new Error('Failed to load Excel parser'))
          document.head.appendChild(s)
        })
        const XLSX = await loadXLSX()
        const buf = await csvFile.arrayBuffer()
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) || []
        let lnIdx = 0, fnIdx = 1, stIdx = 2, emIdx = -1, ctIdx = -1, dtIdx = -1, exIdx = -1
        if (rows.length > 0) {
          const hdr = (rows[0] || []).map(x => (x ?? '').toString().trim().toLowerCase())
          const hset = hdr.join(' ')
          if (hset.includes('last') && hset.includes('first')) {
            lnIdx = hdr.findIndex(h => h === 'lastname' || h === 'last name' || h === 'last')
            fnIdx = hdr.findIndex(h => h === 'firstname' || h === 'first name' || h === 'first')
            stIdx = hdr.findIndex(h => h === 'status')
            emIdx = hdr.findIndex(h => h === 'email' || h === 'e-mail')
            ctIdx = hdr.findIndex(h => h === 'contact' || h === 'phone' || h === 'contact number' || h === 'mobile')
            dtIdx = hdr.findIndex(h => h === 'interview date' || h === 'interviewdate' || h === 'date')
            exIdx = hdr.findIndex(h => h === 'exam score' || h === 'examscore' || h === 'score')
            if (lnIdx === -1) lnIdx = 0
            if (fnIdx === -1) fnIdx = 1
            if (stIdx === -1) stIdx = 2
            rows.shift()
          }
        }
        const normalizeDate = (v) => {
          if (v === null || v === undefined || v === '') return ''
          // Excel serial number handling
          if (typeof v === 'number' && Number.isFinite(v)) {
            const ms = Math.round((v - 25569) * 86400 * 1000)
            const d = new Date(ms)
            return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
          }
          const s = (v ?? '').toString().trim()
          if (!s) return ''
          // ISO yyyy-mm-dd
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
            const [yy, mm, dd] = s.split('-')
            return `${yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
          }
          // d/m/yyyy or m/d/yyyy
          const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
          if (m) {
            let a = parseInt(m[1],10), b = parseInt(m[2],10), y = m[3]
            // Assume MM/DD by default; if first >12, treat as DD/MM
            const mm = a > 12 ? b : a
            const dd = a > 12 ? a : b
            return `${y}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
          }
          const d = new Date(s)
          return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
        }
        for (const r of rows) {
          const arr = (r || []).map(x => (x ?? '').toString().trim())
          const lastName = arr[lnIdx] || ''
          const firstName = arr[fnIdx] || ''
          const statusRaw = arr[stIdx] || ''
          const email = emIdx >= 0 ? (arr[emIdx] || '') : ''
          const contact = ctIdx >= 0 ? (arr[ctIdx] || '') : ''
          // Use raw value from the worksheet row to preserve numeric serials
          let interviewDate = dtIdx >= 0 ? normalizeDate(r[dtIdx]) : ''
          const examScoreRaw = exIdx >= 0 ? (arr[exIdx] || '') : ''
          if (!firstName || !lastName) continue
          const payload = { firstName, lastName, status: toApiStatus(statusRaw || 'Pending'), batch: year, batchId, interviewer, ...(email ? { email } : {}), ...(contact ? { contact } : {}), ...(interviewDate ? { interviewDate } : {}) }
          try {
            await api.post('/students', payload)
            // Upsert exam score to reports
            const studentName = `${firstName} ${lastName}`.trim()
            const hasScore = (examScoreRaw ?? '') !== '' && !Number.isNaN(Number(examScoreRaw))
            await api.post('/reports/records', {
              studentName,
              batch: year,
              date: interviewDate || undefined,
              result: toApiStatus(statusRaw || 'Pending'),
              examScore: hasScore ? Number(examScoreRaw) : undefined,
              interviewerName: interviewer || undefined,
            })
            success += 1
          } catch (_) {}
        }
      } else {
        const text = await csvFile.text()
        const lines = text.split(/\r?\n/).filter(Boolean)
        // Initialize all indices including Interview Date (dtIdx)
        let lnIdx = 0, fnIdx = 1, stIdx = 2, emIdx = -1, ctIdx = -1, dtIdx = -1
        if (lines.length) {
          const hdrParts = lines[0].split(',').map(s => s.trim().toLowerCase())
          const hset = hdrParts.join(' ')
          if (hset.includes('last') && hset.includes('first')) {
            lnIdx = hdrParts.findIndex(h => h === 'lastname' || h === 'last name' || h === 'last')
            fnIdx = hdrParts.findIndex(h => h === 'firstname' || h === 'first name' || h === 'first')
            stIdx = hdrParts.findIndex(h => h === 'status')
            emIdx = hdrParts.findIndex(h => h === 'email' || h === 'e-mail')
            // Accept more variations for contact header, including 'contact #' and common abbreviations
            ctIdx = hdrParts.findIndex(h => h === 'contact' || h === 'phone' || h === 'contact number' || h === 'mobile' || h === 'contact #' || h === 'contact no' || h === 'contact no.')
            dtIdx = hdrParts.findIndex(h => h === 'interview date' || h === 'interviewdate' || h === 'date')
            if (lnIdx === -1) lnIdx = 0
            if (fnIdx === -1) fnIdx = 1
            if (stIdx === -1) stIdx = 2
            lines.shift()
          }
        }
        const normalizeDate = (s0) => {
          const s = (s0 ?? '').toString().trim()
          if (!s) return ''
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
            const [yy, mm, dd] = s.split('-')
            return `${yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
          }
          const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
          if (m) {
            let a = parseInt(m[1],10), b = parseInt(m[2],10), y = m[3]
            const mm = a > 12 ? b : a
            const dd = a > 12 ? a : b
            return `${y}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
          }
          const d = new Date(s)
          return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
        }
        for (const line of lines) {
          const parts = line.split(',').map(s => s.trim())
          const lastName = parts[lnIdx] || ''
          const firstName = parts[fnIdx] || ''
          const statusRaw = parts[stIdx] || ''
          const email = emIdx >= 0 ? (parts[emIdx] || '') : ''
          const contact = ctIdx >= 0 ? (parts[ctIdx] || '') : ''
          let interviewDate = dtIdx >= 0 ? normalizeDate(parts[dtIdx] || '') : ''
          const examScoreRaw = (() => {
            // Try to detect Exam Score column if present
            const exPos = (() => {
              const header = (lines[0] || '').toLowerCase()
              const partsH = header.split(',').map(s => s.trim())
              const idx = partsH.findIndex(h => h === 'exam score' || h === 'examscore' || h === 'score')
              return idx
            })()
            if (exPos >= 0) return parts[exPos] || ''
            return ''
          })()
          if (!firstName || !lastName) continue
          const payload = { firstName, lastName, status: toApiStatus(statusRaw || 'Pending'), batch: year, batchId, interviewer, ...(email ? { email } : {}), ...(contact ? { contact } : {}), ...(interviewDate ? { interviewDate } : {}) }
          try {
            await api.post('/students', payload)
            // Upsert exam score to reports
            const studentName = `${firstName} ${lastName}`.trim()
            const hasScore = (examScoreRaw ?? '') !== '' && !Number.isNaN(Number(examScoreRaw))
            await api.post('/reports/records', {
              studentName,
              batch: year,
              date: interviewDate || undefined,
              result: toApiStatus(statusRaw || 'Pending'),
              examScore: hasScore ? Number(examScoreRaw) : undefined,
              interviewerName: interviewer || undefined,
            })
            success += 1
          } catch (_) {}
        }
      }
      const res = await api.get('/batches')
      const rows = (res?.rows || []).map((b) => ({ id: b.id, code: b.code, year: b.year, index: b.index, interviewer: b.interviewer || '', status: toUiStatus(b.status), studentsCount: b.studentsCount || 0, createdAt: b.createdAt || '' }))
      setBatches(rows)
      setIsImportOpen(false)
      if (success > 0) window.alert(`Imported ${success} students from file`)
      else window.alert('No students were imported. Please check the first sheet/columns or file format.')
    } catch (_) {
      window.alert('Import failed. Please confirm the file format and try again.')
    } finally { setImportLoading(false) }
  }

  const handleAddStudentSubmit = async () => {
    if (!selectedBatch) return
    const payload = {
      firstName: (addValues.firstName || '').trim(),
      lastName: (addValues.lastName || '').trim(),
      email: (addValues.email || '').trim(),
      contact: (addValues.contact || '').trim(),
      status: toApiStatus(addValues.status),
      batchId: selectedBatch.id,
      batch: selectedBatch.year,
      interviewer: selectedBatch.interviewer || '',
    }
    const rawDate = (addValues.interviewDate || '').trim()
    if (rawDate) {
      const d = new Date(rawDate)
      if (!isNaN(d.getTime())) payload.interviewDate = d.toISOString().slice(0,10)
    }
    if (!payload.firstName || !payload.lastName) return
    try {
      const res = await api.post('/students', payload)
      const saved = res?.doc || {}
      const mapped = { id: String(saved._id || ''), firstName: saved.firstName || payload.firstName, lastName: saved.lastName || payload.lastName, status: toUiStatus(saved.status || payload.status), email: saved.email || payload.email, contact: saved.contact || payload.contact, interviewDate: saved.interviewDate || payload.interviewDate || '' }
      setShowAdd(false)
      setAddValues({ firstName: '', lastName: '', email: '', contact: '', interviewDate: '', status: 'Pending', examScore: '' })
      if (showMembers) setMembers(prev => [mapped, ...prev])
      setSelectedBatch(prev => prev ? { ...prev, studentsCount: (prev.studentsCount || 0) + 1 } : prev)
      setBatches(prev => prev.map(b => b.id === selectedBatch.id ? { ...b, studentsCount: (b.studentsCount || 0) + 1 } : b))
      // create report record if exam score or interview meta provided
      try {
        const scoreProvided = (addValues.examScore ?? '') !== ''
        const resultMap = { Pending: 'PENDING', Interviewed: 'PENDING', Passed: 'PASSED', Failed: 'FAILED', Enrolled: 'PASSED', AWOL: 'FAILED' }
        const result = resultMap[addValues.status] || 'PENDING'
        if (scoreProvided || addValues.interviewDate) {
          const rep = {
            studentName: `${payload.firstName} ${payload.lastName}`.trim(),
            batch: selectedBatch.year,
            date: payload.interviewDate ? new Date(payload.interviewDate).toISOString() : undefined,
            result,
            examScore: scoreProvided ? Number(addValues.examScore) : undefined,
            interviewerName: selectedBatch.interviewer || undefined,
          }
          await api.post('/reports/records', rep)
        }
      } catch (_) {}
    } catch (_) {}
  }

  return {
    // data/state
    batches,
    batchesLoading,
    query,
    filterBatch,
    filterStatus,
    filterInterviewer,
    sortField,
    sortDir,
    selectedIds,
    batchOptions,
    statusOptions,
    interviewerOptions,
    displayedBatches,
    allDisplayedSelected,
    activeChips,
    selectedBatch,
    isModalOpen,
    isEditing,
    formValues,
    members,
    membersLoading,
    showMembers,
    showAdd,
    addValues,
    isAddBatchOpen,
    addBatchValues,
    addBatchLoading,
    isImportOpen,
    importValues,
    importLoading,
    importBatchId,
    appendBatchId,
    importCreate,
    importMode,
    csvFile,

    // setters/handlers
    setQuery,
    setFilterBatch,
    setFilterStatus,
    setFilterInterviewer,
    setSortField,
    setSortDir,
    toggleRow,
    toggleAllDisplayed,
    handleDeleteSelected,
    setIsModalOpen,
    setSelectedBatch,
    setIsEditing,
    setFormValues,
    setMembers,
    setShowMembers,
    setShowAdd,
    setAddValues,
    setIsAddBatchOpen,
    setAddBatchValues,
    handleAddBatch,
    submitAddBatch,
    submitAddBatchAndImport,
    setIsImportOpen,
    setImportValues,
    setImportBatchId,
    setAppendBatchId,
    setImportCreate,
    setImportMode,
    setCsvFile,
    handleRowClick,
    closeModal,
    loadMembers,
    openImportForBatch,
    submitImport,
    submitImportCsv,
    handleAddStudentSubmit,
  }
}
