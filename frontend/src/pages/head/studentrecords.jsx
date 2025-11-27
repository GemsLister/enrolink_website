import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { toUiStatus, toApiStatus, getStatusBadge } from '../../utils/status'
import StudentFilters from './components/StudentFilters'
import StudentTable from './components/StudentTable'
import StudentDetailsModal from './components/StudentDetailsModal'
import { useStudentRecords } from './hooks/useStudentRecords'
import ImportModal from './components/ImportModal'

export default function StudentRecords() {
    const { isAuthenticated, user, token } = useAuth()
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />
    const api = useApi(token)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [importMode, setImportMode] = useState('file')
    const [importValues, setImportValues] = useState({ spreadsheetId: '', range: '', year: String(new Date().getFullYear()) })
    const [importCreate, setImportCreate] = useState({ interviewer: '', status: 'PENDING' })
    const [csvFile, setCsvFile] = useState(null)
    const [importLoading, setImportLoading] = useState(false)
    const [importBatchId, setImportBatchId] = useState('')
    const [appendBatchId, setAppendBatchId] = useState('')
    const {
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
    } = useStudentRecords(token)

    const handleImport = () => {
      setIsImportOpen(true)
      setImportMode('file')
      setCsvFile(null)
      setImportValues(v => ({ ...v, year: String(new Date().getFullYear()) }))
      setImportBatchId('')
      setAppendBatchId('')
      setImportCreate({ interviewer: '', status: 'PENDING' })
    }

    const submitImport = async () => {
      const spreadsheetId = (importValues.spreadsheetId || '').trim()
      const range = (importValues.range || '').trim()
      const year = (importValues.year || '').trim()
      if (!spreadsheetId || !range || !year) return
      try {
        setImportLoading(true)
        let batchId = ''
        // Always create a new batch here (no append in Student Records)
        const interviewerReq = (importCreate.interviewer || '').trim()
        if (!interviewerReq) { setImportLoading(false); return }
        const payload = { year, interviewer: interviewerReq, status: toApiStatus(importCreate.status) }
        const created = await api.post('/batches', payload)
        batchId = created?.doc?.id || created?.doc?._id || ''
        if (!batchId) throw new Error('Failed to create batch')
        const resp = await api.post('/sheets/import', { spreadsheetId, range, batch: year, batchId })
        setIsImportOpen(false)
        const imported = Number(resp?.imported || 0)
        if (!Number.isNaN(imported)) window.alert(`Imported ${imported} students from Google Sheets`)
      } catch (_) {
      } finally { setImportLoading(false) }
    }

    const submitImportCsv = async () => {
      if (!csvFile) return
      const year = (importValues.year || '').trim()
      if (!year) return
      try {
        setImportLoading(true)
        const interviewerReq = (importCreate.interviewer || '').trim()
        if (!interviewerReq) { setImportLoading(false); return }
        const payloadNew = { year, interviewer: interviewerReq, status: toApiStatus(importCreate.status) }
        const created = await api.post('/batches', payloadNew)
        const batchId = created?.doc?.id || created?.doc?._id || ''
        if (!batchId) throw new Error('Failed to create batch')
        const name = (csvFile.name || '').toLowerCase()
        let success = 0
        const interviewer = interviewerReq
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
            if (typeof v === 'number' && Number.isFinite(v)) {
              const ms = Math.round((v - 25569) * 86400 * 1000)
              const d = new Date(ms)
              return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
            }
            const s = (v ?? '').toString().trim()
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
          for (const r of rows) {
            const arr = (r || []).map(x => (x ?? '').toString().trim())
            const lastName = arr[lnIdx] || ''
            const firstName = arr[fnIdx] || ''
            const statusRaw = arr[stIdx] || ''
            const email = emIdx >= 0 ? (arr[emIdx] || '') : ''
            const contact = ctIdx >= 0 ? (arr[ctIdx] || '') : ''
            let interviewDate = dtIdx >= 0 ? normalizeDate(r[dtIdx]) : ''
            const examScoreRaw = exIdx >= 0 ? (arr[exIdx] || '') : ''
            if (!firstName || !lastName) continue
            const payload = { firstName, lastName, status: toApiStatus(statusRaw || 'Pending'), batch: year, batchId, interviewer, ...(email ? { email } : {}), ...(contact ? { contact } : {}), ...(interviewDate ? { interviewDate } : {}) }
            try {
              await api.post('/students', payload)
              success += 1
            } catch (_) {}
          }
        } else {
          const text = await csvFile.text()
          const lines = text.split(/\r?\n/).filter(Boolean)
          let lnIdx = 0, fnIdx = 1, stIdx = 2, emIdx = -1, ctIdx = -1, dtIdx = -1
          if (lines.length) {
            const hdrParts = lines[0].split(',').map(s => s.trim().toLowerCase())
            const hset = hdrParts.join(' ')
            if (hset.includes('last') && hset.includes('first')) {
              lnIdx = hdrParts.findIndex(h => h === 'lastname' || h === 'last name' || h === 'last')
              fnIdx = hdrParts.findIndex(h => h === 'firstname' || h === 'first name' || h === 'first')
              stIdx = hdrParts.findIndex(h => h === 'status')
              emIdx = hdrParts.findIndex(h => h === 'email' || h === 'e-mail')
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
            if (!firstName || !lastName) continue
            const payload = { firstName, lastName, status: toApiStatus(statusRaw || 'Pending'), batch: year, batchId, interviewer, ...(email ? { email } : {}), ...(contact ? { contact } : {}), ...(interviewDate ? { interviewDate } : {}) }
            try {
              await api.post('/students', payload)
              success += 1
            } catch (_) {}
          }
        }
        setIsImportOpen(false)
        if (success > 0) window.alert(`Imported ${success} students from file`)
        else window.alert('No students were imported. Please check the first sheet/columns or file format.')
      } catch (_) {
        window.alert('Import failed. Please confirm the file format and try again.')
      } finally { setImportLoading(false) }
    }

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 bg-gray-50 px-8 pt-8 pb-4 overflow-y-auto h-[100dvh]">
                <StudentFilters
                  title="STUDENT RECORDS"
                  activeChips={activeChips}
                  query={query}
                  setQuery={setQuery}
                  batchOptions={batchOptions}
                  statusOptions={statusOptions}
                  interviewerOptions={interviewerOptions}
                  filterBatch={filterBatch}
                  setFilterBatch={setFilterBatch}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterInterviewer={filterInterviewer}
                  setFilterInterviewer={setFilterInterviewer}
                  sortField={sortField}
                  setSortField={setSortField}
                  sortDir={sortDir}
                  setSortDir={setSortDir}
                  selectedIds={selectedIds}
                  handleDeleteSelected={handleDeleteSelected}
                  handleAddStudent={handleAddStudent}
                  handleImport={handleImport}
                />

                <StudentTable
                  studentsLoading={studentsLoading}
                  displayedStudents={displayedStudents}
                  batches={batches}
                  allDisplayedSelected={allDisplayedSelected}
                  toggleAllDisplayed={toggleAllDisplayed}
                  selectedIds={selectedIds}
                  toggleRow={toggleRow}
                  handleRowClick={handleRowClick}
                  sortField={sortField}
                  sortDir={sortDir}
                  onHeaderSort={(field) => {
                    setSortField(prev => (prev === field ? (setSortDir(d => d === 'asc' ? 'desc' : 'asc'), prev) : (setSortDir('asc'), field)));
                  }}
                  getStatusBadge={getStatusBadge}
                />


                <StudentDetailsModal
                  isOpen={isModalOpen}
                  selectedStudent={selectedStudent}
                  isEditing={isEditing}
                  formValues={formValues}
                  setFormValues={setFormValues}
                  batches={batches}
                  closeModal={closeModal}
                  handleEditSave={handleEditSave}
                />

                <ImportModal
                  isOpen={isImportOpen}
                  setIsOpen={setIsImportOpen}
                  importMode={importMode}
                  setImportMode={setImportMode}
                  importValues={importValues}
                  setImportValues={setImportValues}
                  batches={[]}
                  importBatchId={importBatchId}
                  appendBatchId={appendBatchId}
                  setImportBatchId={setImportBatchId}
                  setAppendBatchId={setAppendBatchId}
                  importCreate={importCreate}
                  setImportCreate={setImportCreate}
                  csvFile={csvFile}
                  setCsvFile={setCsvFile}
                  importLoading={importLoading}
                  submitImport={submitImport}
                  submitImportCsv={submitImportCsv}
                />

            </div>
        </div>
    );
}
