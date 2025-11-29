import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../../../hooks/useApi'
import { toUiStatus, toApiStatus } from '../../../utils/status'

export function useStudentRecords(token) {
  const api = useApi(token)

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState(null)

  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [batches, setBatches] = useState([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterBatch, setFilterBatch] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterInterviewer, setFilterInterviewer] = useState('All')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const batchOptions = useMemo(() => {
    const set = new Set((students || []).map(s => s.batch).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [students])

  const statusOptions = useMemo(() => {
    const set = new Set((students || []).map(s => s.status).filter(Boolean))
    const base = ['Passed', 'Failed', 'Pending']
    return ['All', ...Array.from(new Set([...base, ...Array.from(set)])).sort()]
  }, [students])

  const interviewerOptions = useMemo(() => {
    const set = new Set((students || []).map(s => s.interviewer).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [students])

  const displayedStudents = useMemo(() => {
    let rows = students.slice()
    if (filterBatch !== 'All') rows = rows.filter(s => (s.batch || '') === filterBatch)
    if (filterStatus !== 'All') rows = rows.filter(s => (s.status || '') === filterStatus)
    if (filterInterviewer !== 'All') rows = rows.filter(s => (s.interviewer || '') === filterInterviewer)
    const q = debouncedQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter(s => (
        `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(q) ||
        (s.batch || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.interviewer || '').toLowerCase().includes(q)
      ))
    }
    rows.sort((a, b) => {
      let av = ''
      let bv = ''
      if (sortField === 'name') {
        av = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase()
        bv = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase()
      } else if (sortField === 'batch') {
        av = (a.batch || '').toLowerCase()
        bv = (b.batch || '').toLowerCase()
      } else if (sortField === 'status') {
        av = (a.status || '').toLowerCase()
        bv = (b.status || '').toLowerCase()
      } else if (sortField === 'interviewer') {
        av = (a.interviewer || '').toLowerCase()
        bv = (b.interviewer || '').toLowerCase()
      } else if (sortField === 'date') {
        av = (a.interviewDate || '')
        bv = (b.interviewDate || '')
      } else if (sortField === 'score') {
        av = String(a.examScore ?? '')
        bv = String(b.examScore ?? '')
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [students, filterBatch, filterStatus, filterInterviewer, debouncedQuery, sortField, sortDir])

  const allDisplayedSelected = useMemo(() => {
    if (!displayedStudents.length) return false
    for (const s of displayedStudents) {
      if (!selectedIds.has(s.id)) return false
    }
    return true
  }, [displayedStudents, selectedIds])

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
      displayedStudents.forEach(s => next.add(s.id))
      return next
    })
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    try {
      for (const id of ids) {
        await api.del(`/students/${id}`)
      }
      setStudents(prev => prev.filter(s => !selectedIds.has(s.id)))
      clearSelection()
    } catch (_) {}
  }

  const activeChips = useMemo(() => {
    const chips = []
    if (filterBatch !== 'All') chips.push(`Batch: ${filterBatch}`)
    if (filterStatus !== 'All') chips.push(`Status: ${filterStatus}`)
    if (filterInterviewer !== 'All') chips.push(`Interviewer: ${filterInterviewer}`)
    if (query.trim()) chips.push(`Search: ${query.trim()}`)
    const label = {
      name: 'Name',
      batch: 'Batch',
      date: 'Interview Date',
      interviewer: 'Interviewer',
      status: 'Status',
    }[sortField] || 'Name'
    chips.push(`Sort: ${label} (${sortDir === 'asc' ? 'Asc' : 'Desc'})`)
    return chips
  }, [filterBatch, filterStatus, filterInterviewer, query, sortField, sortDir])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setStudentsLoading(true)
        const params = {}
        // Add any additional query parameters here if needed
        const queryString = Object.keys(params)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
          .join('&')
        const url = `/students${queryString ? `?${queryString}` : ''}`
        const res = await api.get(url)
        const rows = (res?.rows || []).map((s) => ({
          id: s._id,
          __v: typeof s.__v === 'number' ? s.__v : undefined,
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          batch: s.batch || '',
          batchId: s.batchId ? String(s.batchId) : undefined,
          status: toUiStatus(s.status),
          contact: s.contact || '',
          email: s.email || '',
          interviewDate: s.interviewDate || '',
          interviewer: s.interviewer || '',
          remarks: s.remarks || '',
          examScore: undefined,
        }))
        if (mounted) setStudents(rows)
        // fetch reports and merge exam scores by normalized name
        try {
          const rep = await api.get('/reports')
          const map = new Map()
          ;(rep?.rows || []).forEach(r => {
            const name = (r.studentName || '').toString().trim().toLowerCase()
            if (!name) return
            map.set(name, typeof r.examScore === 'number' ? r.examScore : (r.examScore ?? undefined))
          })
          if (mounted) {
            setStudents(prev => prev.map(s => {
              const n1 = `${s.firstName} ${s.lastName}`.trim().toLowerCase()
              const n2 = `${s.lastName} ${s.firstName}`.trim().toLowerCase()
              const score = map.get(n1) ?? map.get(n2)
              return { ...s, examScore: score }
            }))
          }
        } catch (_) {}
      } catch (error) {
        console.error('Error loading students:', error)
      } finally { if (mounted) setStudentsLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [api])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let mounted = true
    async function loadBatches() {
      try {
        const res = await api.get('/batches')
        const rows = (res?.rows || []).map((b) => ({
          id: b.id,
          year: b.year,
          interviewer: b.interviewer || '',
          code: b.code,
        }))
        if (mounted) setBatches(rows)
      } catch (_) {}
    }
    loadBatches()
    return () => { mounted = false }
  }, [api])

  const handleRowClick = (student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
    setIsEditing(false)
    setFormValues(student)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStudent(null)
    setIsEditing(false)
    setFormValues(null)
  }

  const handleAddStudent = () => {
    const currentYear = String(new Date().getFullYear())
    const defaultBatch = batches.find(b => String(b.year) === currentYear)
    const empty = {
      id: undefined,
      __v: undefined,
      firstName: '',
      lastName: '',
      batch: currentYear,
      batchId: defaultBatch ? defaultBatch.id : undefined,
      status: 'Pending',
      contact: '',
      email: '',
      interviewDate: '',
      interviewer: defaultBatch ? defaultBatch.interviewer : '',
      remarks: '',
    }
    setSelectedStudent(empty)
    setFormValues(empty)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!isEditing) { setIsEditing(true); return }
    if (formValues) {
      try {
        const payload = {
          id: formValues.id,
          __v: typeof formValues.__v === 'number' ? formValues.__v : undefined,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          batch: formValues.batch,
          batchId: formValues.batchId,
          status: toApiStatus(formValues.status),
          contact: formValues.contact,
          email: formValues.email,
          interviewDate: formValues.interviewDate,
          interviewer: formValues.interviewer,
          remarks: formValues.remarks,
          examScore: formValues.examScore,
        }
        const res = await api.post('/students', payload)
        const saved = res?.doc || {}
        const mapped = {
          id: saved._id || formValues.id,
          __v: typeof saved.__v === 'number' ? saved.__v : formValues.__v,
          firstName: saved.firstName ?? formValues.firstName,
          lastName: saved.lastName ?? formValues.lastName,
          batch: saved.batch ?? formValues.batch,
          batchId: saved.batchId ? String(saved.batchId) : formValues.batchId,
          status: toUiStatus(saved.status ?? formValues.status),
          contact: formValues.contact,
          email: formValues.email,
          interviewDate: formValues.interviewDate,
          interviewer: formValues.interviewer,
          remarks: formValues.remarks,
          examScore: formValues.examScore,
        }
        setStudents((prev) => {
          const exists = prev.some((s) => s.id === mapped.id)
          return exists ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [mapped, ...prev]
        })
        setSelectedStudent(mapped)
        setFormValues(mapped)

        // Upsert exam score to reports (read-only source of truth)
        try {
          const scoreProvided = (formValues.examScore ?? '') !== ''
          const studentName = `${mapped.firstName} ${mapped.lastName}`.trim()
          if (studentName) {
            await api.post('/reports/records', {
              studentName,
              batch: mapped.batch,
              date: mapped.interviewDate || undefined,
              result: toApiStatus(mapped.status),
              examScore: scoreProvided ? Number(formValues.examScore) : undefined,
              interviewerName: mapped.interviewer || undefined,
            })
          }
        } catch (_) {}
      } catch (e) {
        if (e && e.status === 409) {
          try {
            const res = await api.get('/students')
            const rows = (res?.rows || []).map((s) => ({
              id: s._id,
              __v: typeof s.__v === 'number' ? s.__v : undefined,
              firstName: s.firstName || '',
              lastName: s.lastName || '',
              batch: s.batch || '',
              batchId: s.batchId ? String(s.batchId) : undefined,
              status: toUiStatus(s.status),
              contact: s.contact || '',
              email: s.email || '',
              interviewDate: s.interviewDate || '',
              interviewer: s.interviewer || '',
              remarks: s.remarks || '',
              examScore: undefined,
            }))
            setStudents(rows)
            window.alert('Update conflict: The record was modified by someone else. Your view has been refreshed. Please retry your changes.')
          } catch (_) {
            window.alert('Update conflict detected. Please reload and try again.')
          }
        }
      }
    }
    setIsEditing(false)
  }

  return {
    // data
    students,
    studentsLoading,
    batches,
    query,
    filterBatch,
    filterStatus,
    filterInterviewer,
    sortField,
    sortDir,
    selectedIds,
    displayedStudents,
    batchOptions,
    statusOptions,
    interviewerOptions,
    allDisplayedSelected,
    activeChips,
    selectedStudent,
    isModalOpen,
    isEditing,
    formValues,

    // setters/handlers
    setQuery,
    setFilterBatch,
    setFilterStatus,
    setFilterInterviewer,
    setSortField,
    setSortDir,
    toggleRow,
    toggleAllDisplayed,
    handleRowClick,
    handleDeleteSelected,
    handleAddStudent,
    closeModal,
    handleEditSave,
    setFormValues,
  }
}
