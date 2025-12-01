import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

const APPLICANT_COLUMNS = [
  { key: 'number', label: 'No.', width: '90px' },
  { key: 'course', label: 'Course', width: '140px' },
  { key: 'examineeNo', label: 'Examinee No.', width: '160px' },
  { key: 'source', label: 'Source', width: '140px' },
  { key: 'lastName', label: 'Lastname', width: '160px' },
  { key: 'firstName', label: 'Firstname', width: '160px' },
  { key: 'middleName', label: 'Middle Name', width: '180px' },
  { key: 'email', label: 'Email Address', width: '220px' },
  { key: 'percentileScore', label: 'Percentile Score', width: '160px' },
  { key: 'shsStrand', label: 'SHS Strand', width: '140px' },
  { key: 'shs', label: 'SHS', width: '200px' },
  { key: 'contact', label: 'Contact #', width: '160px' },
  { key: 'shsGpa', label: 'SHS GPA', width: '140px' },
  { key: 'interviewDate', label: 'Interview Date', width: '160px' },
  { key: 'academicTechnicalBackground', label: 'Academic Technical Background', width: '220px' },
  { key: 'skillsCompetencies', label: 'Skills and Competencies', width: '220px' },
  {
    key: 'timeManagement',
    label: 'Time Management and Organization including Teamwork Collaboration',
    width: '320px',
  },
  {
    key: 'communicationSkills',
    label: 'Communication Skills / Technical Communication Skills',
    width: '280px',
  },
  { key: 'problemSolving', label: 'Problem Solving / Analytical Skills', width: '240px' },
  { key: 'ethicsIntegrity', label: 'Ethics and Integrity', width: '200px' },
  { key: 'qScore', label: 'Q Score (40%) Interview Questions', width: '220px' },
  { key: 'interviewerDecision', label: 'Interviewer’s Decision', width: '200px' },
  { key: 'pScore', label: 'P Score (30%) entrance exam', width: '220px' },
  { key: 'sScore', label: 'S Score (30%) GPA in SHS', width: '220px' },
  { key: 'finalScore', label: 'Final Score (Percentile Score, Q Score, S Score)', width: '260px' },
  { key: 'remarks', label: 'Remarks', width: '200px' },
  { key: 'recordCategory', label: 'Status', width: '150px' },
  { key: 'actions', label: 'Actions', width: '160px' },
]

const ENROLLEE_COLUMNS = [
  { key: 'course', label: 'Course', width: '140px' },
  { key: 'examineeNo', label: 'Enrollee No.', width: '160px' },
  { key: 'lastName', label: 'Lastname', width: '160px' },
  { key: 'firstName', label: 'Firstname', width: '160px' },
  { key: 'middleName', label: 'Middle Name', width: '180px' },
  { key: 'email', label: 'Email Address', width: '220px' },
  { key: 'contact', label: 'Contact #', width: '160px' },
  { key: 'enrollmentStatus', label: 'Enrollment Status', width: '180px' },
  { key: 'recordCategory', label: 'Status', width: '150px' },
  { key: 'remarks', label: 'Remarks', width: '200px' },
  { key: 'actions', label: 'Actions', width: '160px' },
]

const STUDENT_COLUMNS = [
  { key: 'course', label: 'Course', width: '140px' },
  { key: 'examineeNo', label: 'Student No.', width: '160px' },
  { key: 'lastName', label: 'Lastname', width: '160px' },
  { key: 'firstName', label: 'Firstname', width: '160px' },
  { key: 'middleName', label: 'Middle Name', width: '180px' },
  { key: 'email', label: 'Email Address', width: '220px' },
  { key: 'contact', label: 'Contact #', width: '160px' },
  { key: 'interviewDate', label: 'Date Enrolled', width: '160px' },
  { key: 'recordCategory', label: 'Status', width: '150px' },
  { key: 'actions', label: 'Actions', width: '160px' },
]

const IMPORT_HEADERS_APPLICANTS = [
  { key: 'number', label: 'no.' },
  { key: 'course', label: 'course' },
  { key: 'examineeNo', label: 'examinee no.' },
  { key: 'source', label: 'source' },
  { key: 'lastName', label: 'lastname' },
  { key: 'firstName', label: 'firstname' },
  { key: 'middleName', label: 'middle name' },
  { key: 'email', label: 'email' },
  { key: 'percentileScore', label: 'percentile' },
  { key: 'shsStrand', label: 'strand' },
  { key: 'shs', label: 'shs' },
  { key: 'contact', label: 'contact' },
  { key: 'shsGpa', label: 'shs_gpa' },
  { key: 'interviewDate', label: 'interview date' },
  { key: 'academicTechnicalBackground', label: 'rating_academic' },
  { key: 'skillsCompetencies', label: 'rating_skills' },
  { key: 'timeManagement', label: 'rating_teamwork' },
  { key: 'communicationSkills', label: 'rating_comm' },
  { key: 'problemSolving', label: 'rating_problem' },
  { key: 'ethicsIntegrity', label: 'rating_ethics' },
  { key: 'qScore', label: 'q_score' },
  { key: 'interviewerDecision', label: 'decision' },
  { key: 'sScore', label: 's_score' },
  { key: 'finalScore', label: 'final score' },
  { key: 'remarks', label: 'remarks' },
]

const IMPORT_HEADERS_STUDENTS = [
  { key: 'course', label: 'course' },
  { key: 'examineeNo', label: 'student_no' },
  { key: 'lastName', label: 'lastname' },
  { key: 'firstName', label: 'firstname' },
  { key: 'middleName', label: 'middle_name' },
  { key: 'email', label: 'email' },
  { key: 'contact', label: 'contact' },
  { key: 'interviewDate', label: 'date_enrolled' },
]

const IMPORT_HEADERS_ENROLLEES = [
  { key: 'course', label: 'course' },
  { key: 'examineeNo', label: 'enrollee_no' },
  { key: 'lastName', label: 'lastname' },
  { key: 'firstName', label: 'firstname' },
  { key: 'middleName', label: 'middle_name' },
  { key: 'email', label: 'email' },
  { key: 'contact', label: 'contact' },
  { key: 'enrollmentStatus', label: 'enrollment_status' },
  { key: 'remarks', label: 'remarks' },
]

const DATE_COLUMN_KEYS = new Set(['interviewDate'])
const RATING_COLUMN_KEYS = new Set([
  'academicTechnicalBackground',
  'skillsCompetencies',
  'timeManagement',
  'communicationSkills',
  'problemSolving',
  'ethicsIntegrity',
])
const PERCENTAGE_COLUMN_KEYS = new Set(['percentileScore', 'pScore', 'qScore', 'sScore', 'finalScore'])
const CATEGORY_OPTIONS = ['Applicant', 'Enrollee', 'Student']
const SHS_STRAND_OPTIONS = ['STEM', 'ABM', 'HUMSS', 'TVL-ICT']
const DECISION_OPTIONS = ['PASSED', 'FAILED', 'NO RESULT']
const SOURCE_OPTIONS = ['WAITLIST', 'PRIORITY', 'VVIP']
const ENROLLMENT_STATUS_OPTIONS = ['ENROLLED', 'PENDING']
const VIEW_TO_CATEGORY = {
  applicants: 'Applicant',
  enrollees: 'Enrollee',
  students: 'Student',
}

const ALL_COLUMN_KEYS = Array.from(
  new Set([...APPLICANT_COLUMNS, ...ENROLLEE_COLUMNS, ...STUDENT_COLUMNS].map((column) => column.key))
)

const EMPTY_RECORD = ALL_COLUMN_KEYS.reduce((acc, key) => {
  acc[key] = ''
  return acc
}, {})

const VIEW_META = {
  enrollees: {
    title: 'Enrollee Records',
    subtitle: 'List of First Year Enrollees.',
  },
  applicants: {
    title: 'Applicant Records',
    subtitle: 'List of First Year Applicants.',
  },
  students: {
    title: 'Student Records',
    subtitle: 'List of First Year Students.',
  },
}

const CARD_DEFS = [
  {
    key: 'applicants',
    title: 'Applicants',
    description: 'In-flight applicants waiting for interviews and scoring.',
    accent: 'from-red-200 to-pink-100',
  },
  {
    key: 'enrollees',
    title: 'Enrollees',
    description: 'Confirmed learners already slotted for the term.',
    accent: 'from-rose-200 to-rose-100',
  },
  {
    key: 'students',
    title: 'Students',
    description: 'Returning students progressing through the program.',
    accent: 'from-rose-200 to-amber-100',
  },
  {
    key: 'archive',
    title: 'Archive',
    description: 'Browse archived records and restore or purge.',
    accent: 'from-rose-200 to-pink-100',
  },
]

const titleCase = (value) => {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const formatPercent = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const num = Number(raw.replace(/%$/, ''))
  if (!Number.isFinite(num)) return raw.endsWith('%') ? raw : `${raw}%`
  return `${num.toFixed(2)}%`
}

const toNumber = (value) => {
  const raw = String(value ?? '').trim()
  const num = Number(raw.replace(/%$/, ''))
  return Number.isFinite(num) ? num : 0
}

const computeQPercent = (src) => {
  const k = ['academicTechnicalBackground','skillsCompetencies','timeManagement','communicationSkills','problemSolving','ethicsIntegrity']
  const sum = k.reduce((acc, key) => acc + toNumber(src?.[key]), 0)
  const pct = (sum / 30) * 100
  return Number.isFinite(pct) ? pct : 0
}

const computeFinalPercent = (src) => {
  const q = computeQPercent(src)
  const p = toNumber(src?.percentileScore)
  const s = toNumber(src?.shsGpa)
  const final = (q * 0.4) + (p * 0.3) + (s * 0.3)
  return Number.isFinite(final) ? final : 0
}

const normalizeText = (value, type) => {
  if (value === undefined || value === null) return ''
  const stringValue = typeof value === 'string' ? value : String(value)
  const cleaned = stringValue
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')
  if (type === 'name') {
    return titleCase(cleaned)
  }
  return cleaned
}

const normalizeDate = (value, format = 'long') => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return ''
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const yyyy = date.getUTCFullYear()
    return format === 'short' ? `${mm}/${dd}/${String(yyyy).slice(-2)}` : `${mm}/${dd}/${yyyy}`
  }
  const text = normalizeText(value)
  if (!text) return ''
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [y, m, d] = text.split('-')
    const mm = m.padStart(2, '0')
    const dd = d.padStart(2, '0')
    return format === 'short' ? `${mm}/${dd}/${String(y).slice(-2)}` : `${mm}/${dd}/${y}`
  }
  const shortMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (shortMatch) {
    const mm = shortMatch[1].padStart(2, '0')
    const dd = shortMatch[2].padStart(2, '0')
    const yy = shortMatch[3]
    const year = Number(yy) + (Number(yy) >= 70 ? 1900 : 2000)
    return format === 'short' ? `${mm}/${dd}/${yy}` : `${mm}/${dd}/${year}`
  }
  const alt = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (alt) {
    const [, a, b, y] = alt
    const month = parseInt(a, 10) > 12 ? b : a
    const day = parseInt(a, 10) > 12 ? a : b
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return format === 'short' ? `${mm}/${dd}/${String(y).slice(-2)}` : `${mm}/${dd}/${y}`
  }
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getUTCDate()).padStart(2, '0')
  const yyyy = parsed.getUTCFullYear()
  return format === 'short' ? `${mm}/${dd}/${String(yyyy).slice(-2)}` : `${mm}/${dd}/${yyyy}`
}

const parseXlsx = async (file, forcedCategory, importHeaders, { dateFormat = 'long' } = {}) => {
  const XLSXMod = await import('xlsx')
  const XLSX = XLSXMod.default || XLSXMod
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  if (!rawRows.length) throw new Error('The uploaded file is empty.')

  const header = rawRows[0].map((cell) => normalizeText(cell).toLowerCase())
  const expectedHeaders = importHeaders.map((h) => h.label)
  const headerMap = Object.fromEntries(header.map((h, i) => [h, i]))
  const isValid = expectedHeaders.every((label) => headerMap[label] !== undefined)
  if (!isValid) {
    throw new Error('Column headers do not match the required template.')
  }

  const dataRows = rawRows.slice(1)

  return dataRows
    .map((row) => {
      if (!row || row.every((cell) => normalizeText(cell) === '')) return null
      const record = importHeaders.reduce((acc, column) => {
        const idx = headerMap[column.label]
        const rawValue = idx !== undefined ? row[idx] : ''
        if (column.key === 'course') {
          const normalized = normalizeText(rawValue).toUpperCase()
          acc[column.key] = normalized === 'BSIT' || normalized === 'BSEMC-DAT' ? normalized : ''
        } else if (column.key === 'source') {
          const normalized = normalizeText(rawValue).toUpperCase()
          acc[column.key] = SOURCE_OPTIONS.includes(normalized) ? normalized : ''
        } else if (column.key === 'enrollmentStatus') {
          const normalized = normalizeText(rawValue).toUpperCase()
          acc[column.key] = ENROLLMENT_STATUS_OPTIONS.includes(normalized) ? normalized : ''
        } else if (['firstName', 'middleName', 'lastName'].includes(column.key)) {
          acc[column.key] = normalizeText(rawValue, 'name')
        } else if (column.key === 'interviewDate') {
          acc[column.key] = normalizeDate(rawValue, dateFormat)
        } else if (PERCENTAGE_COLUMN_KEYS.has(column.key)) {
          acc[column.key] = normalizeText(rawValue)
        } else {
          acc[column.key] = DATE_COLUMN_KEYS.has(column.key) ? normalizeDate(rawValue) : normalizeText(rawValue)
        }
        return acc
      }, {})
      if (forcedCategory) {
        record.recordCategory = forcedCategory
      } else if (!record.recordCategory) {
        record.recordCategory = 'Applicant'
      }
      record.qScore = computeQPercent(record)
      record.finalScore = computeFinalPercent(record)
      if (!record.sScore) record.sScore = record.shsGpa || ''
      return record
    })
    .filter(Boolean)
}

function useBanner() {
  const [banner, setBanner] = useState(null)
  useEffect(() => {
    if (!banner) return
    const timeout = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(timeout)
  }, [banner])
  return [banner, setBanner]
}

export function RecordsOverviewContent({ basePath }) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden">
      <div className="h-full flex flex-col px-10 pt-12 pb-10 space-y-10">
        <header className="space-y-3">
          <p className="uppercase tracking-[0.4em] text-sm text-rose-400">Records</p>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold text-[#5b1a30]">Complete Records Library</h1>
              <p className="text-base text-[#8b4a5d] mt-2 max-w-3xl">
                Quickly jump into the specific record set you need. Each space inherits the same spacious,
                database-backed table for effortless reviewing and editing.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                placeholder="Search modules"
                className="w-full rounded-full border border-rose-100 bg-white/90 px-5 py-3 text-sm text-rose-700 placeholder:text-rose-300 focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CARD_DEFS.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(`${basePath}/${card.key}`)}
              className={`group w-full rounded-[32px] bg-gradient-to-b ${card.accent} p-8 text-left shadow-[0_35px_80px_rgba(244,154,154,0.35)] focus:outline-none focus:ring-4 focus:ring-rose-200`}
            >
              <div className="flex flex-col h-full gap-6">
                <div className="h-16 w-16 rounded-2xl bg-white/80 flex items-center justify-center text-rose-400 text-2xl font-semibold shadow-inner">
                  {card.title.charAt(0)}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-sm uppercase tracking-[0.4em] text-rose-400">Records</p>
                  <h2 className="text-2xl font-semibold text-[#5b1a30]">{card.title}</h2>
                  <p className="text-sm text-[#7c3a4a] leading-relaxed">{card.description}</p>
                </div>
                <span className="text-sm font-medium text-[#5b1a30] group-hover:translate-x-1 transition-transform">
                  Open {card.title} →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RecordsPanel({ token, view = 'applicants', basePath }) {
    const api = useApi(token)
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const editingRowRef = useRef(null)
  const rowsRef = useRef([])
  const tableScrollRef = useRef(null)
  const lastScrollPosRef = useRef({ left: 0, top: 0 })
  const handleTableScroll = useCallback((event) => {
    const el = event.currentTarget || event.target
    if (!el) return
    lastScrollPosRef.current = {
      left: el.scrollLeft || 0,
      top: el.scrollTop || 0,
    }
    if (sortMenuKey) setSortMenuKey('')
  }, [])
  const restoreScroll = useCallback(() => {
    const el = tableScrollRef.current
    if (!el) return
    const maxLeft = Math.max(0, (el.scrollWidth || 0) - (el.clientWidth || 0))
    const maxTop = Math.max(0, (el.scrollHeight || 0) - (el.clientHeight || 0))
    const desiredLeft = Math.max(0, Math.min(lastScrollPosRef.current.left || 0, maxLeft))
    const desiredTop = Math.max(0, Math.min(lastScrollPosRef.current.top || 0, maxTop))
    el.scrollLeft = desiredLeft
    el.scrollTop = desiredTop
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (!tableScrollRef.current) return
        tableScrollRef.current.scrollLeft = desiredLeft
        tableScrollRef.current.scrollTop = desiredTop
      })
    }
    setTimeout(() => {
      if (!tableScrollRef.current) return
      tableScrollRef.current.scrollLeft = desiredLeft
      tableScrollRef.current.scrollTop = desiredTop
    }, 0)
  }, [])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingMeta, setEditingMeta] = useState(null)
  const [editingValues, setEditingValues] = useState(EMPTY_RECORD)
  const [banner, setBanner] = useBanner()
  const [sortConfigs, setSortConfigs] = useState([])
  const [sortMenuKey, setSortMenuKey] = useState('')
  const sortMenuRefs = useRef({})
  const sortMenuOverlayRef = useRef(null)
  const [sortMenuPos, setSortMenuPos] = useState({ left: 0, top: 0 })
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [archiveType, setArchiveType] = useState('enrollees')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportSelected, setExportSelected] = useState([])
  const [exportScope, setExportScope] = useState('filtered')
  const [exportOrientation, setExportOrientation] = useState('landscape')
  const [exportPaperSize, setExportPaperSize] = useState('A4')
  const [selectedRows, setSelectedRows] = useState([])
  

  const isArchiveView = view === 'archive'
  const currentCategory = isArchiveView ? VIEW_TO_CATEGORY[archiveType] : (VIEW_TO_CATEGORY[view] || 'Applicant')
  const currentView = VIEW_META[view] || VIEW_META.applicants
  const headerTitle = isArchiveView
    ? (archiveType === 'enrollees' ? 'Archived Enrollees' : (archiveType === 'students' ? 'Archived Students' : 'Archived Applicants'))
    : currentView.title
  const headerSubtitle = isArchiveView
    ? (archiveType === 'enrollees'
        ? 'List of Archived First Year Enrollees'
        : (archiveType === 'students'
            ? 'List of Archived First Year Students'
            : 'List of Archived First Year Applicants'))
    : currentView.subtitle
  const isStudentView = (isArchiveView ? archiveType === 'students' : view === 'students')
  const isEnrolleeView = (isArchiveView ? archiveType === 'enrollees' : view === 'enrollees')
  const columns = isStudentView ? STUDENT_COLUMNS : isEnrolleeView ? ENROLLEE_COLUMNS : APPLICANT_COLUMNS
  const importHeaders = isStudentView
    ? IMPORT_HEADERS_STUDENTS
    : isEnrolleeView
      ? IMPORT_HEADERS_ENROLLEES
      : IMPORT_HEADERS_APPLICANTS
  const navLinks = useMemo(
    () => CARD_DEFS.map((card) => ({ key: card.key, label: card.title, href: `${basePath}/${card.key}` })),
    [basePath]
  )
  const exportableColumns = useMemo(() => columns.filter((c) => c.key !== 'actions'), [columns])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (currentCategory) params.recordCategory = currentCategory
      params.archived = isArchiveView ? '1' : '0'
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&')
      const url = `/students${queryString ? `?${queryString}` : ''}`
      const res = await api.get(url)
      const docs = Array.isArray(res?.rows) ? res.rows : []
      setRows(docs)
      rowsRef.current = docs
    } catch (error) {
      console.error('Error fetching records:', error)
      setBanner({ type: 'error', message: error.message || 'Unable to load records.' })
    } finally {
      setLoading(false)
    }
  }, [api, currentCategory, isArchiveView, setBanner])

  useEffect(() => {
    fetchRows()
  }, [fetchRows, view, archiveType, isArchiveView])

  useEffect(() => {
    if (!loading) restoreScroll()
  }, [loading, restoreScroll])

  const getSortOptions = (key) => {
    if (key === 'recordCategory' || key === 'remarks') {
      return null
    }
    if (key === 'actions') return null
    if (key === 'number') {
      const nums = Array.from(new Set((filteredRows || rows || [])
        .map((r) => Number(r?.number))
        .filter((n) => Number.isFinite(n))
      )).sort((a, b) => a - b)
      const numberOptions = nums.map((n) => ({ value: `eq:${n}`, label: String(n) }))
      return [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' },
        { value: 'waitlist', label: 'WAITLIST' },
        ...numberOptions,
      ]
    }
    if (key === 'course') {
      return [
        { value: 'bsit', label: 'BSIT' },
        { value: 'bsemc-dat', label: 'BSEMC-DAT' },
      ]
    }
    if (key === 'source') {
      return [
        { value: 'waitlist', label: 'WAITLIST' },
        { value: 'priority', label: 'PRIORITY' },
        { value: 'vvip', label: 'VVIP' },
      ]
    }
    if (key === 'shsStrand') {
      return [
        { value: 'stem', label: 'STEM' },
        { value: 'abm', label: 'ABM' },
        { value: 'humss', label: 'HUMSS' },
        { value: 'tvl-ict', label: 'TVL-ICT' },
      ]
    }
    if (key === 'interviewerDecision') {
      return [
        { value: 'passed', label: 'Passed' },
        { value: 'failed', label: 'Failed' },
        { value: 'no-result', label: 'NO RESULT' },
      ]
    }
    if (key === 'enrollmentStatus') {
      return [
        { value: 'pending', label: 'PENDING' },
        { value: 'enrolled', label: 'ENROLLED' },
      ]
    }
    return [
      { value: 'asc', label: 'Ascending' },
      { value: 'desc', label: 'Descending' },
    ]
  }

  const handleSortChange = (key, direction) => {
    if (!direction) {
      setSortConfigs((prev) => prev.filter((s) => s.key !== key))
    } else {
      setSortConfigs((prev) => {
        const filtered = prev.filter((s) => s.key !== key)
        return [...filtered, { key, direction }]
      })
    }
    setSortMenuKey('')
  }

  const toggleSortMenu = (key) => {
    setSortMenuKey((prev) => {
      const next = prev === key ? '' : key
      if (next) {
        const node = sortMenuRefs.current[key]
        if (node) {
          const rect = node.getBoundingClientRect()
          const left = Math.max(8, Math.min(rect.left, (window.innerWidth || 0) - 208))
          const top = Math.max(8, rect.bottom + 8)
          setSortMenuPos({ left, top })
        }
      }
      return next
    })
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!sortMenuKey) return
      const triggerNode = sortMenuRefs.current[sortMenuKey]
      const overlayNode = sortMenuOverlayRef.current
      const target = event.target
      const insideTrigger = triggerNode && triggerNode.contains(target)
      const insideOverlay = overlayNode && overlayNode.contains(target)
      if (!insideTrigger && !insideOverlay) {
        setSortMenuKey('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortMenuKey])

  const applySort = useCallback(
    (list) => {
      if (!sortConfigs.length) return list
      const sorted = [...list]
      const compareString = (a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' })
      
      sorted.sort((aRow, bRow) => {
        for (const { key, direction } of sortConfigs) {
          const aVal = aRow[key]
          const bVal = bRow[key]
          let comparison = 0
          
          if (key === 'number' && typeof direction === 'string' && direction.startsWith('eq:')) {
            const target = Number(direction.slice(3))
            const aNum = Number(aVal)
            const bNum = Number(bVal)
            const aMatch = Number.isFinite(aNum) && aNum === target
            const bMatch = Number.isFinite(bNum) && bNum === target
            if (aMatch !== bMatch) {
              comparison = aMatch ? -1 : 1
            } else if (aMatch && bMatch) {
              comparison = 0
            } else {
              // fallback: keep existing ordering or group non-matches by asc number
              if (Number.isFinite(aNum) && Number.isFinite(bNum)) comparison = aNum - bNum
              else comparison = compareString(String(aVal ?? ''), String(bVal ?? ''))
            }
          } else if (key === 'number' && direction === 'waitlist') {
            const aIs = String(aVal || '').toUpperCase() === 'WAITLIST'
            const bIs = String(bVal || '').toUpperCase() === 'WAITLIST'
            if (aIs !== bIs) {
              comparison = aIs ? -1 : 1
            } else if (!aIs && !bIs) {
              const aNum = Number(aVal)
              const bNum = Number(bVal)
              if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
                comparison = aNum - bNum
              } else {
                comparison = compareString(String(aVal ?? ''), String(bVal ?? ''))
              }
            }
          } else if (key === 'course') {
            const order = { BSIT: 0, 'BSEMC-DAT': 1 }
            const aIdx = order[String(aVal || '').toUpperCase()] ?? 99
            const bIdx = order[String(bVal || '').toUpperCase()] ?? 99
            if (direction === 'bsit') {
              if (aIdx === 0 && bIdx === 0) comparison = 0
              else if (aIdx === 0) comparison = -1
              else if (bIdx === 0) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'bsemc-dat') {
              if (aIdx === 1 && bIdx === 1) comparison = 0
              else if (aIdx === 1) comparison = -1
              else if (bIdx === 1) comparison = 1
              else comparison = aIdx - bIdx
            }
          } else if (key === 'source') {
            const order = { WAITLIST: 0, PRIORITY: 1, VVIP: 2 }
            const aIdx = order[String(aVal || '').toUpperCase()] ?? 99
            const bIdx = order[String(bVal || '').toUpperCase()] ?? 99
            if (direction === 'waitlist') {
              if (aIdx === 0 && bIdx === 0) comparison = 0
              else if (aIdx === 0) comparison = -1
              else if (bIdx === 0) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'priority') {
              if (aIdx === 1 && bIdx === 1) comparison = 0
              else if (aIdx === 1) comparison = -1
              else if (bIdx === 1) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'vvip') {
              if (aIdx === 2 && bIdx === 2) comparison = 0
              else if (aIdx === 2) comparison = -1
              else if (bIdx === 2) comparison = 1
              else comparison = aIdx - bIdx
            }
          } else if (key === 'shsStrand') {
            const order = { STEM: 0, ABM: 1, HUMSS: 2, 'TVL-ICT': 3 }
            const aIdx = order[String(aVal || '').toUpperCase()] ?? 99
            const bIdx = order[String(bVal || '').toUpperCase()] ?? 99
            if (direction === 'stem') {
              if (aIdx === 0 && bIdx === 0) comparison = 0
              else if (aIdx === 0) comparison = -1
              else if (bIdx === 0) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'abm') {
              if (aIdx === 1 && bIdx === 1) comparison = 0
              else if (aIdx === 1) comparison = -1
              else if (bIdx === 1) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'humss') {
              if (aIdx === 2 && bIdx === 2) comparison = 0
              else if (aIdx === 2) comparison = -1
              else if (bIdx === 2) comparison = 1
              else comparison = aIdx - bIdx
            } else if (direction === 'tvl-ict') {
              if (aIdx === 3 && bIdx === 3) comparison = 0
              else if (aIdx === 3) comparison = -1
              else if (bIdx === 3) comparison = 1
              else comparison = aIdx - bIdx
            }
        } else if (key === 'interviewerDecision') {
          const order = { PASSED: 0, FAILED: 1, 'NO RESULT': 2 }
          const aIdx = order[String(aVal || '').toUpperCase()] ?? 99
          const bIdx = order[String(bVal || '').toUpperCase()] ?? 99
          if (direction === 'passed') {
            if (aIdx === 0 && bIdx === 0) comparison = 0
            else if (aIdx === 0) comparison = -1
            else if (bIdx === 0) comparison = 1
            else comparison = aIdx - bIdx
          } else if (direction === 'failed') {
            if (aIdx === 1 && bIdx === 1) comparison = 0
            else if (aIdx === 1) comparison = -1
            else if (bIdx === 1) comparison = 1
            else comparison = aIdx - bIdx
          } else if (direction === 'no-result') {
            if (aIdx === 2 && bIdx === 2) comparison = 0
            else if (aIdx === 2) comparison = -1
            else if (bIdx === 2) comparison = 1
            else comparison = aIdx - bIdx
          }
        } else if (key === 'enrollmentStatus') {
          const order = { PENDING: 0, ENROLLED: 1 }
          const aIdx = order[String(aVal || '').toUpperCase()] ?? 99
          const bIdx = order[String(bVal || '').toUpperCase()] ?? 99
          if (direction === 'pending') {
            if (aIdx === 0 && bIdx === 0) comparison = 0
            else if (aIdx === 0) comparison = -1
            else if (bIdx === 0) comparison = 1
            else comparison = aIdx - bIdx
          } else if (direction === 'enrolled') {
            if (aIdx === 1 && bIdx === 1) comparison = 0
            else if (aIdx === 1) comparison = -1
            else if (bIdx === 1) comparison = 1
            else comparison = aIdx - bIdx
          }
          } else if (RATING_COLUMN_KEYS.has(key)) {
            const aNum = Number(aVal)
            const bNum = Number(bVal)
            if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
              comparison = direction === 'asc' ? aNum - bNum : bNum - aNum
            } else {
              comparison = compareString(String(aVal ?? ''), String(bVal ?? ''))
              comparison = direction === 'asc' ? comparison : -comparison
            }
          } else if (key === 'number') {
            const aNum = Number(aVal)
            const bNum = Number(bVal)
            if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
              comparison = direction === 'asc' ? aNum - bNum : bNum - aNum
            } else {
              comparison = compareString(String(aVal ?? ''), String(bVal ?? ''))
              comparison = direction === 'asc' ? comparison : -comparison
          }
        } else {
            comparison = compareString(String(aVal ?? ''), String(bVal ?? ''))
            comparison = direction === 'asc' ? comparison : -comparison
          }
          
          if (comparison !== 0) return comparison
        }
        return 0
      })
      return sorted
    },
    [sortConfigs]
  )

  const filteredRows = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const first = String(normalizeText(row.firstName, 'name') || '').toLowerCase()
      const middle = String(normalizeText(row.middleName, 'name') || '').toLowerCase()
      const last = String(normalizeText(row.lastName, 'name') || '').toLowerCase()
      const candidates = [
        first,
        middle,
        last,
        [last, first, middle].filter(Boolean).join(' '),
        [first, middle, last].filter(Boolean).join(' '),
        [first, last].filter(Boolean).join(' '),
        [last, first].filter(Boolean).join(' '),
      ]
      return candidates.some((c) => c && c.includes(q))
    })
  }, [rows, searchQuery])

  const sortedRows = useMemo(() => applySort(filteredRows), [filteredRows, applySort])

  const getRowId = (row) => row._id || row.__clientId || ''
  const allVisibleSelected = useMemo(() => {
    const ids = sortedRows.map(getRowId).filter(Boolean)
    if (!ids.length) return false
    const set = new Set(selectedRows)
    return ids.every((id) => set.has(id))
  }, [sortedRows, selectedRows])
  const toggleRowSelect = (row) => {
    const id = getRowId(row)
    if (!id) return
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const selectAllVisible = () => {
    const ids = sortedRows.map(getRowId).filter(Boolean)
    setSelectedRows(ids)
  }
  const clearSelection = () => setSelectedRows([])

  const cancelEditing = useCallback(() => {
    if (!editingId) return
    if (editingMeta?.isNew && editingMeta?.clientId) {
      setRows((prev) => prev.filter((row) => (row._id || row.__clientId) !== editingMeta.clientId))
    }
    setEditingId(null)
    setEditingMeta(null)
    setEditingValues(EMPTY_RECORD)
    restoreScroll()
  }, [editingId, editingMeta])

  const beginEditing = useCallback((row, meta = {}) => {
    const identifier = row._id || row.__clientId
    if (!identifier) return
    if (row.archived_at || isArchiveView) return
    if (tableScrollRef.current) {
      lastScrollPosRef.current = {
        left: tableScrollRef.current.scrollLeft || 0,
        top: tableScrollRef.current.scrollTop || 0,
      }
    }
    setEditingId(identifier)
    const values = {}
    ALL_COLUMN_KEYS.forEach((key) => {
      values[key] = row[key] ?? ''
    })
    setEditingValues(values)
    setEditingMeta({
      id: row._id,
      __v: row.__v,
      clientId: row.__clientId,
      isNew: meta.isNew ?? !row._id,
    })
  }, [])

  const saveEditing = useCallback(async () => {
    if (!editingId || saving) return
    if (tableScrollRef.current) {
      lastScrollPosRef.current = {
        left: tableScrollRef.current.scrollLeft || 0,
        top: tableScrollRef.current.scrollTop || 0,
      }
    }
    const requiredFields = ['firstName', 'lastName']
    const missingField = requiredFields.find((field) => !normalizeText(editingValues[field]))
    if (missingField) {
      setBanner({ type: 'error', message: 'Firstname and Lastname are required.' })
      return
    }
    const payload = { ...editingValues }
    if (currentCategory === 'Enrollee') {
      const status = normalizeText(payload.enrollmentStatus).toUpperCase()
      payload.enrollmentStatus = ENROLLMENT_STATUS_OPTIONS.includes(status) ? status : 'PENDING'
    } else {
      delete payload.enrollmentStatus
    }
    payload.qScore = computeQPercent(payload)
    payload.finalScore = computeFinalPercent(payload)
    if (!payload.sScore) payload.sScore = payload.shsGpa || ''
    if (editingMeta?.id) {
      payload.id = editingMeta.id
      if (editingMeta?.__v !== undefined) payload.__v = editingMeta.__v
    }
    try {
      setSaving(true)
              await api.post('/students', payload)
      setBanner({ type: 'success', message: 'Record saved successfully.' })
      await fetchRows()
      restoreScroll()
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Failed to save record.' })
    } finally {
      setSaving(false)
      setEditingId(null)
      setEditingMeta(null)
      setEditingValues(EMPTY_RECORD)
    }
  }, [api, editingId, editingMeta, editingValues, fetchRows, saving, setBanner])

  useEffect(() => {
    if (!editingId) return
    const handler = (event) => {
      if (!editingRowRef.current) return
      if (!editingRowRef.current.contains(event.target)) {
        cancelEditing()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingId, cancelEditing])

  useEffect(() => {
    if (!editingId) restoreScroll()
  }, [editingId, restoreScroll])

  const focusEditingRow = useCallback(() => {
    const focus = () => {
      if (!editingRowRef.current) return
      const firstInput = editingRowRef.current.querySelector('input, select, textarea')
      if (firstInput && typeof firstInput.focus === 'function') {
        try { firstInput.focus({ preventScroll: true }) } catch (_) { firstInput.focus() }
      }
      restoreScroll()
    }
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(focus)
    } else {
      setTimeout(focus, 0)
    }
  }, [])

  useEffect(() => {
    if (!editingId) return
    focusEditingRow()
  }, [editingId, focusEditingRow])

  const handleAddNew = () => {
    cancelEditing()
    const clientId = `temp-${Date.now()}`
    const freshRow = { ...EMPTY_RECORD, recordCategory: currentCategory, __clientId: clientId }
    if (currentCategory === 'Enrollee') freshRow.enrollmentStatus = 'PENDING'
    setRows((prev) => [freshRow, ...prev.filter((row) => !row.__clientId)])
    beginEditing(freshRow, { isNew: true })
  }

  const handleFieldChange = (key, value) => {
    setEditingValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void saveEditing()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setImporting(true)
      const dateFormat = isStudentView ? 'short' : 'long'
      const parsed = await parseXlsx(file, currentCategory, importHeaders, { dateFormat })

      let successCount = 0
      for (const record of parsed) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await api.post('/students', record)
          successCount += 1
        } catch (err) {
          // swallow duplicate errors, show after loop
        }
      }

      setBanner({ type: 'success', message: `Imported ${successCount} record(s).` })
      await fetchRows()
      if (tableScrollRef.current) {
        const l = lastScrollPosRef.current.left || 0
        const t = lastScrollPosRef.current.top || 0
        tableScrollRef.current.scrollLeft = l
        tableScrollRef.current.scrollTop = t
      }
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Import failed. Please verify the template.' })
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const triggerImport = () => fileInputRef.current?.click()

  const handleExportPdf = async () => {
    const selectedKeys = exportSelected.length ? exportSelected : exportableColumns.map((c) => c.key)
    const selectedCols = exportableColumns.filter((c) => selectedKeys.includes(c.key))
    const data = exportScope === 'selected'
      ? sortedRows.filter((r) => selectedRows.includes(getRowId(r)))
      : (exportScope === 'filtered' ? sortedRows : applySort(rows))
    const findLabel = (key) => (columns.find((c) => c.key === key)?.label || key)
    const formatCell = (key, val) => {
      if (['firstName', 'middleName', 'lastName'].includes(key)) return normalizeText(val, 'name') || ''
      if (isStudentView && key === 'interviewDate') return normalizeDate(val, 'short') || ''
      if (PERCENTAGE_COLUMN_KEYS.has(key) || key === 'pScore') return formatPercent(val)
      return String(val ?? '')
    }

    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ])
    const autoTable = autoTableModule.default
    const formatMap = { A4: 'a4', Letter: 'letter', Legal: 'legal' }
    const doc = new jsPDF({ orientation: exportOrientation, unit: 'mm', format: formatMap[exportPaperSize] || 'a4' })

    let y = 10
    doc.setFontSize(16)
    doc.text(headerTitle, 10, y)
    y += 6
    doc.setFontSize(11)
    doc.text(headerSubtitle, 10, y)
    y += 8

    const headAll = selectedCols.map((c) => findLabel(c.key))
    const bodyAll = data.map((row) => selectedCols.map((c) => {
      const key = c.key
      if (key === 'pScore') return formatCell(key, row.percentileScore)
      if (key === 'sScore') return formatCell(key, row.shsGpa)
      if (key === 'qScore') return formatCell(key, computeQPercent(row))
      if (key === 'finalScore') return formatCell(key, computeFinalPercent(row))
      return formatCell(key, row[key])
    }))

    autoTable(doc, {
      head: [headAll],
      body: bodyAll,
      startY: y,
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [249, 196, 196], textColor: [91, 26, 48] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 10, left: 10, right: 10, bottom: 10 },
      tableWidth: 'auto',
      horizontalPageBreak: true,
      didDrawPage: (dataCtx) => {
        const pageCount = typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : (doc.internal.getNumberOfPages?.() || 1)
        const pageInfo = doc.internal.getCurrentPageInfo?.()
        const pageNumber = dataCtx.pageNumber || pageInfo?.pageNumber || 1
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFontSize(9)
        doc.text(`${pageNumber}/${pageCount}`, pw - 12, ph - 6, { align: 'right' })
      },
    })

    const datasetName = isStudentView ? 'students' : (isEnrolleeView ? 'enrollees' : 'applicants')
    const fileName = `records_${datasetName}_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(fileName)
    setShowExportModal(false)
  }

  const handleArchive = async (row) => {
    try {
      const payload = {}
      ALL_COLUMN_KEYS.forEach((k) => { payload[k] = row[k] ?? '' })
      if (row._id) payload.id = row._id
      if (row.__v !== undefined) payload.__v = row.__v
      payload.archived_at = new Date().toISOString()
      await api.post('/students', payload)
      setBanner({ type: 'success', message: 'Archived successfully.' })
      const key = isStudentView ? 'students' : (isEnrolleeView ? 'enrollees' : 'applicants')
      navigate(`${basePath}/archive?type=${encodeURIComponent(key)}`)
      await fetchRows()
    } catch (e) {
      setBanner({ type: 'error', message: e.message || 'Failed to archive.' })
    }
  }

  const handleRestore = async (row) => {
    try {
      const payload = {}
      ALL_COLUMN_KEYS.forEach((k) => { payload[k] = row[k] ?? '' })
      if (row._id) payload.id = row._id
      if (row.__v !== undefined) payload.__v = row.__v
      payload.archived_at = null
      await api.post('/students', payload)
      setBanner({ type: 'success', message: 'Restored successfully.' })
      await fetchRows()
    } catch (e) {
      setBanner({ type: 'error', message: e.message || 'Failed to restore.' })
    }
  }

  const handleDelete = async (row) => {
    try {
      if (!row._id) return
      await api.delete(`/students/${row._id}`)
      setBanner({ type: 'success', message: 'Deleted permanently.' })
      await fetchRows()
    } catch (e) {
      setBanner({ type: 'error', message: e.message || 'Failed to delete.' })
    }
  }

  useEffect(() => {
    if (isArchiveView) {
      const params = new URLSearchParams(location.search || '')
      const t = params.get('type')
      if (t && (t === 'enrollees' || t === 'applicants' || t === 'students')) {
        setArchiveType(t)
      }
    }
  }, [location.search, isArchiveView])

    return (
    <div className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden">
      <div className="h-full flex flex-col px-10 pt-10 pb-8 space-y-6">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="uppercase tracking-[0.4em] text-xs text-rose-400">Records</p>
              <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-3 flex items-center gap-3 border-2 border-[#6b2b2b]">
                <button type="button" className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#2f2b33] border border-[#efccd2]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
                </button>
                <span className="h-5 w-px bg-[#e4b7bf]" />
                <span className="text-gray-800 font-medium inline-flex items-center gap-1">Santiago Garcia <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span>
              </div>
            </div>
            <h1 className="text-4xl font-semibold text-[#5b1a30]">{headerTitle}</h1>
            <p className="text-base text-[#8b4a5d] max-w-3xl">{headerSubtitle}</p>
            <div className="w-full max-w-sm mt-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name"
                className="w-full rounded-full border border-rose-200 bg-white px-5 py-3 text-sm text-[#5b1a30] placeholder:text-black-300 focus:border-black-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {navLinks.map((link) => {
              const isDatasetTab = link.key === 'enrollees' || link.key === 'applicants' || link.key === 'students'
              const archiveActive = isArchiveView && link.key === 'archive'
              const datasetActive = (isArchiveView && isDatasetTab && archiveType === link.key) || (!isArchiveView && view === link.key)
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => {
                    if (link.key === 'archive') {
                      if (isArchiveView) {
                        const dest = archiveType || 'applicants'
                        navigate(`${basePath}/${dest}`)
                      } else {
                        const current = isStudentView ? 'students' : (isEnrolleeView ? 'enrollees' : 'applicants')
                        navigate(`${basePath}/archive?type=${encodeURIComponent(current)}`)
                      }
                      return
                    }
                    if (isArchiveView && isDatasetTab) {
                      navigate(`${basePath}/archive?type=${encodeURIComponent(link.key)}`)
                    } else {
                      navigate(link.href)
                    }
                  }}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition ${
                    archiveActive
                      ? 'bg-[#a62a49] text-white shadow-lg shadow-rose-200/60'
                      : datasetActive
                        ? 'bg-[#c4375b] text-white shadow-lg shadow-rose-200/60'
                        : 'bg-white text-[#c4375b]'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-4 min-h-[48px]">
            <div className="flex-1">
              <div className={banner ? 'block' : 'hidden'}>
                <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${
                  banner?.type === 'error' ? 'bg-[#F7D9D9] text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {banner?.message}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
            <button
              type="button"
              onClick={() => { setExportSelected(exportableColumns.map((c) => c.key)); setShowExportModal(true) }}
              className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b] shadow-sm transition hover:border-rose-400"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => setShowFormatModal(true)}
              disabled={importing}
              className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b] shadow-sm transition hover:border-rose-400 disabled:opacity-60"
            >
              {importing
                ? 'Importing…'
                : isStudentView
                  ? 'Import Students XLSX'
                  : isEnrolleeView
                    ? 'Import Enrollees XLSX'
                    : 'Import Applicants XLSX'}
            </button>
            <button
              type="button"
              onClick={handleAddNew}
              className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49]"
            >
              Add New
            </button>
            </div>
          </div>
        </div>


        <div className="flex-1 rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-0 flex flex-col min-h-0">
          <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
          <div ref={tableScrollRef} onScroll={handleTableScroll} className="flex-1 overflow-auto no-scrollbar rounded-[32px] border border-[#f7d6d6] pb-2">
            <table className="min-w-[1800px] border-collapse">
              <thead>
                <tr className="bg-[#f9c4c4] text-[#5b1a30] text-xs font-semibold uppercase">
                  <th style={{ minWidth: '60px' }} className="px-4 py-4 text-left sticky top-0 z-20 bg-[#f9c4c4]">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => { allVisibleSelected ? clearSelection() : selectAllVisible() }}
                    />
                  </th>
                  {columns.map((column) => {
                    const options = getSortOptions(column.key)
                    const activeSort = sortConfigs.find((s) => s.key === column.key)
                    const selected = activeSort ? activeSort.direction : ''
                    return (
                      <th
                        key={column.key}
                        style={{ minWidth: column.width }}
                        className="px-4 py-4 text-left uppercase tracking-wide sticky top-0 z-20 bg-[#f9c4c4]"
                      >
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-[12px] tracking-[0.2em] text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>{column.label}</span>
                          {options && (
                            <div
                              className="relative"
                              ref={(node) => {
                                if (node) sortMenuRefs.current[column.key] = node
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSortMenu(column.key)}
                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                                  selected ? 'bg-[#c4375b] text-white' : 'bg-white/70 text-[#5b1a30]'
                                }`}
                              >
                                ▼
                              </button>
                              {/* menu rendered as fixed overlay below */}
                            </div>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-sm text-rose-400">
                      Loading records…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-sm text-rose-400">
                      No records available yet. Use “Add New” or Import to get started.
                    </td>
                  </tr>
                )}
                {!loading &&
                  sortedRows.map((row, index) => {
                    const key = row._id || row.__clientId || index
                    const isEditing = editingId === key
                    const background = isEditing
                      ? 'bg-rose-50'
                      : index % 2 === 0
                      ? 'bg-white'
                      : 'bg-[#fafafa]'
                    return (
                      <tr
                        key={key}
                        ref={isEditing ? (node) => (editingRowRef.current = node) : null}
                        className={`${background} border-b border-[#f2f2f2] hover:bg-rose-50 transition`}
                        onDoubleClick={() => beginEditing(row)}
                      >
                        <td className="px-4 py-3 align-middle text-sm text-[#4b1d2d]">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={!getRowId(row)}
                              checked={selectedRows.includes(getRowId(row))}
                              onChange={() => toggleRowSelect(row)}
                            />
                            {isEditing && (
                              <div className="ml-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="rounded-full bg-white border border-rose-200 px-3 py-1 text-xs font-semibold text-[#6b0000] hover:bg-rose-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { void saveEditing() }}
                                  className="rounded-full bg-[#6b0000] px-3 py-1 text-xs font-semibold text-white hover:bg-[#8b0000]"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        {columns.map((column) => {
                          const value = row[column.key] ?? ''
                          return (
                            <td key={column.key} className="px-4 py-3 align-middle text-sm text-[#4b1d2d]">
                              {isEditing ? (
                                column.key === 'recordCategory' ? (
                                  <select
                                    value={editingValues[column.key] ?? currentCategory}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    {CATEGORY_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : column.key === 'course' ? (
                                  <select
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    <option value="">Select</option>
                                    <option value="BSIT">BSIT</option>
                                    <option value="BSEMC-DAT">BSEMC-DAT</option>
                                  </select>
                                ) : column.key === 'source' ? (
                                  <select
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    <option value="">Select</option>
                                    {SOURCE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : column.key === 'enrollmentStatus' ? (
                                  <select
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    <option value="">Select</option>
                                    {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : column.key === 'shsStrand' ? (
                                  <input
                                    type="text"
                                    list="shs-strand-options"
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  />
                                ) : RATING_COLUMN_KEYS.has(column.key) ? (
                                  <select
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    <option value="">Select</option>
                                    {Array.from({ length: 5 }, (_, idx) => String(idx + 1)).map((rating) => (
                                      <option key={rating} value={rating}>
                                        {rating}
                                      </option>
                                    ))}
                                  </select>
                                ) : column.key === 'interviewerDecision' ? (
                                  <select
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  >
                                    <option value="">Select</option>
                                    {DECISION_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : (PERCENTAGE_COLUMN_KEYS.has(column.key) && !['qScore','finalScore'].includes(column.key)) ? (
                                  <input
                                    type="text"
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                    placeholder="e.g. 98.50%"
                                  />
                                ) : DATE_COLUMN_KEYS.has(column.key) ? (
                                  <input
                                    type="text"
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onBlur={(event) => {
                                      const format = isStudentView && column.key === 'interviewDate' ? 'short' : 'long'
                                      const value = normalizeDate(event.target.value, format)
                                      if (value) {
                                        handleFieldChange(column.key, value)
                                      }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                    placeholder={isStudentView && column.key === 'interviewDate' ? 'MM/DD/YY' : 'MM/DD/YYYY'}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={editingValues[column.key] ?? ''}
                                    onChange={(event) => handleFieldChange(column.key, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
                                  />
                                )
                              ) : column.key === 'actions' ? (
                                <div className="flex gap-2">
                                  {(editingId && (row._id || row.__clientId) === editingId && editingMeta?.isNew) ? (
                                    <button
                                      type="button"
                                      onClick={cancelEditing}
                                      className="rounded-full bg-white border border-rose-200 px-3 py-1 text-xs font-semibold text-[#6b0000] hover:bg-rose-50"
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    view !== 'archive' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleArchive(row)}
                                        className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-200"
                                      >
                                        Archive
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleRestore(row)}
                                          className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                                        >
                                          Restore
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(row)}
                                          className="rounded-full bg-white border border-rose-200 px-3 py-1 text-xs font-semibold text-[#c4375b] hover:border-rose-400"
                                        >
                                          Delete Permanently
                                        </button>
                                      </>
                                    )
                                  )}
                                </div>
                              ) : column.key === 'recordCategory' && value ? (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                  {value}
                                </span>
                              ) : (
                                <span>
                                  {(() => {
                                    if (column.key === 'qScore') {
                                      const src = isEditing ? editingValues : row
                                      const formatted = formatPercent(computeQPercent(src))
                                      return formatted || '—'
                                    }
                                    if (column.key === 'finalScore') {
                                      const src = isEditing ? editingValues : row
                                      const formatted = formatPercent(computeFinalPercent(src))
                                      return formatted || '—'
                                    }
                                    if (column.key === 'pScore') {
                                      const src = isEditing ? editingValues.percentileScore : row.percentileScore
                                      const formatted = formatPercent(src)
                                      return formatted || '—'
                                    }
                                    if (column.key === 'sScore') {
                                      const src = isEditing ? editingValues.shsGpa : row.shsGpa
                                      const formatted = formatPercent(src)
                                      return formatted || '—'
                                    }
                                    if (PERCENTAGE_COLUMN_KEYS.has(column.key)) {
                                      const formatted = formatPercent(value)
                                      return formatted || '—'
                                    }
                                    if (['firstName', 'middleName', 'lastName'].includes(column.key)) {
                                      return normalizeText(value, 'name') || '—'
                                    }
                                    if (isStudentView && column.key === 'interviewDate') {
                                      const formatted = normalizeDate(value, 'short')
                                      return formatted || '—'
                                    }
                                    return value || '—'
                                  })()}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {Boolean(sortMenuKey) && (
            <div
              ref={sortMenuOverlayRef}
              style={{ position: 'fixed', left: sortMenuPos.left, top: sortMenuPos.top }}
              className="w-48 rounded-2xl border border-rose-100 bg-white shadow-2xl text-xs text-[#5b1a30] z-[1000]"
            >
              <button
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-rose-50"
                onClick={() => handleSortChange(sortMenuKey, '')}
              >
                Clear sort
              </button>
              <div className="border-t border-rose-50" />
              {(getSortOptions(sortMenuKey) || []).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full px-4 py-2 text-left hover:bg-rose-50 ${
                    (sortConfigs.find((s)=>s.key===sortMenuKey)?.direction || '') === option.value ? 'bg-rose-100 font-semibold' : ''
                  }`}
                  onClick={() => handleSortChange(sortMenuKey, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleImportFile}
      />
      <datalist id="shs-strand-options">
        {SHS_STRAND_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExportModal(false)}>
          <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-rose-100 to-pink-100 px-8 py-6 border-b border-rose-200">
              <h2 className="text-2xl font-semibold text-[#5b1a30]">Export to PDF</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#5b1a30]">Scope</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={exportScope === 'filtered'} onChange={() => setExportScope('filtered')} />
                    Current search/filter
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={exportScope === 'all'} onChange={() => setExportScope('all')} />
                    All rows in view
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={exportScope === 'selected'} onChange={() => setExportScope('selected')} disabled={selectedRows.length === 0} />
                    Selected student(s)
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#5b1a30]">Paper Size</p>
                <div className="w-full max-w-xs">
                  <select
                    value={exportPaperSize}
                    onChange={(e) => setExportPaperSize(e.target.value)}
                    className="w-full rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-[#5b1a30]"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#5b1a30]">Columns</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="rounded-full border border-rose-200 px-3 py-1 text-xs text-[#c4375b]" onClick={() => setExportSelected(exportableColumns.map((c) => c.key))}>Select All</button>
                  <button type="button" className="rounded-full border border-rose-200 px-3 py-1 text-xs text-[#c4375b]" onClick={() => setExportSelected([])}>Clear</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-[#4b1d2d]">
                  {exportableColumns.map((col) => (
                    <label key={col.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportSelected.includes(col.key)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setExportSelected((prev) => {
                            const set = new Set(prev)
                            if (checked) set.add(col.key); else set.delete(col.key)
                            return Array.from(set)
                          })
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#5b1a30]">Orientation</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={exportOrientation === 'landscape'} onChange={() => setExportOrientation('landscape')} />
                    Landscape
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={exportOrientation === 'portrait'} onChange={() => setExportOrientation('portrait')} />
                    Portrait
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-rose-50 px-8 py-6 border-t border-rose-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowExportModal(false)} className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b]">Cancel</button>
              <button type="button" onClick={handleExportPdf} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white hover:bg-[#a62a49]">Export</button>
            </div>
          </div>
        </div>
      )}

      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowFormatModal(false)}>
          <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-rose-100 to-pink-100 px-8 py-6 border-b border-rose-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>XLSX Import Format</h2>
                  <p className="text-sm text-[#8b4a5d] mt-1">Your Excel file must match this exact column structure</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormatModal(false)}
                  className="rounded-full p-2 hover:bg-white/50 transition text-[#5b1a30]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="rounded-2xl border border-rose-200 overflow-hidden">
                <div className="bg-[#f9c4c4] px-4 py-3">
                  <p className="text-sm font-semibold text-[#5b1a30] uppercase tracking-wide">Column Headers (Row 1)</p>
                </div>
                <div className="bg-white p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {importHeaders.map((column, idx) => (
                      <div key={column.key} className="flex items-start gap-2">
                        <span className="text-xs font-medium text-rose-400 min-w-[24px]">{idx + 1}.</span>
                        <span className="text-xs text-[#5b1a30]" style={{ fontFamily: 'var(--font-open-sans)' }}>{column.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-rose-200 overflow-hidden">
                <div className="bg-rose-50 px-4 py-3">
                  <p className="text-sm font-semibold text-[#5b1a30] uppercase tracking-wide">Important Notes</p>
                </div>
                <div className="bg-white p-4 space-y-2 text-sm text-[#4b1d2d]">
                  <p>
                    • Use the simplified headers exactly as shown above (e.g.,{' '}
                    <code>{importHeaders.map((h) => h.label).join(', ')}</code>)
                  </p>
                  <p>• Headers are case-insensitive, but sticking to lowercase avoids typos</p>
                  <p>• Course must be either "BSIT" or "BSEMC-DAT"</p>
                  {isStudentView ? (
                    <>
                      <p>• Student No. maps to the Student No. column in the table</p>
                      <p>• Date Enrolled format: MM/DD/YY (e.g., 08/15/24)</p>
                      <p>• Remarks column is optional and not part of the template</p>
                    </>
                  ) : isEnrolleeView ? (
                    <>
                      <p>• Enrollee No. maps to the Enrollee No. column in the table</p>
                      <p>• Enrollment Status must be ENROLLED or PENDING</p>
                      <p>• Remarks column is optional</p>
                    </>
                  ) : (
                    <>
                      <p>• Source must be WAITLIST, PRIORITY, or VVIP</p>
                      <p>• Interview Date format: MM/DD/YYYY (e.g., 12/09/2004)</p>
                      <p>• Percentile Score, Q Score, S Score, and Final Score can include decimals and % symbol (e.g., 99.20%)</p>
                      <p>• Rating columns (1-10): rating_academic, rating_skills, rating_teamwork, rating_comm, rating_problem, rating_ethics</p>
                      <p>• SHS Strand: STEM, ABM, HUMSS, or TVL-ICT (or custom text)</p>
                      <p>• Interviewer’s Decision: PASSED, FAILED, or NO RESULT</p>
                      <p>• Remarks: Free text (optional notes from the team)</p>
                    </>
                  )}
                  <p>• Status is set automatically based on which Records tab you import from</p>
                </div>
              </div>
            </div>
            <div className="bg-rose-50 px-8 py-6 border-t border-rose-200 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b] shadow-sm transition hover:border-rose-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFormatModal(false)
                  triggerImport()
                }}
                className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:bg-[#a62a49]"
              >
                Choose File
              </button>
            </div>
            </div>
        </div>
      )}
    </div>
  )
}

export function HeadRecordsOverview() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />
  return <Navigate to="/head/records/applicants" replace />
}

export default function StudentRecords({ view = 'applicants' }) {
  const { isAuthenticated, user, token } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <RecordsPanel token={token} view={view} basePath="/head/records" />
    </div>
  )
}
