import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import UserChip from '../../components/UserChip'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { getStatusBadge, toUiStatus } from '../../utils/status'

export default function BatchReport() {
  const { isAuthenticated, user, token } = useAuth()
  const api = useApi(token)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load available batches on mount
  useEffect(() => {
    let active = true
    async function loadBatches() {
      try {
        const res = await api.get('/batches')
        if (active) {
          const batchList = (res.rows || []).map(b => b.code).sort().reverse()
          setBatches(batchList)
          if (batchList.length > 0) {
            setSelectedBatch(batchList[0])
          }
        }
      } catch (e) {
        if (active) console.error('Failed to load batches:', e.message)
      }
    }
    loadBatches()
    return () => { active = false }
  }, [api])

  const generateReport = async () => {
    if (!selectedBatch) {
      setError('Please select a batch first')
      return
    }

    try {
      setLoading(true)
      setError('')
      const res = await api.get(`/reports/batch/report?batch=${encodeURIComponent(selectedBatch)}`)
      setReportData(res)
    } catch (e) {
      setError(e.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedBatch) return
    try {
      const res = await fetch(`/api/reports/batch/pdf?batch=${encodeURIComponent(selectedBatch)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${selectedBatch}-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to download PDF: ' + (e.message || 'Unknown error'))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'DEPT_HEAD') return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-80 shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 bg-[#fff6f7] px-10 pt-12 pb-10 overflow-y-auto">
        <div className="flex items-center justify-end mb-4">
          <UserChip />
        </div>

        <div className="flex items-start justify-between mb-8">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.4em] text-sm text-rose-400">Analytics</p>
            <h1 className="text-4xl font-semibold text-[#5b1a30]">Batch Report</h1>
            <p className="text-sm text-[#8b4a5d]">Summary statistics and student details by batch</p>
          </div>
          <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl px-4 py-3 flex items-center gap-3 border-2 border-[#6b2b2b] shadow-[0_14px_28px_rgba(139,23,47,0.08)]">
            <button
              onClick={handleDownloadPdf}
              disabled={!selectedBatch || loading}
              className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={!selectedBatch || loading}
              className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print
            </button>
          </div>
        </div>

        {/* Batch Selection */}
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="batch-select" className="text-sm font-medium text-[#5b1a30]">
            Select Batch:
          </label>
          <select
            id="batch-select"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="bg-white border border-rose-200 rounded-full px-4 py-2 text-sm text-[#4b1d2d] focus:border-rose-400 focus:outline-none"
          >
            <option value="">-- Select a batch --</option>
            {batches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </select>
          <button
            onClick={generateReport}
            disabled={!selectedBatch || loading}
            className="bg-[#c45a6b] hover:bg-[#a04556] disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-medium text-sm transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#7c3a4a]">Loading report...</div>
        ) : reportData ? (
          <>
            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Total Students</div>
                <div className="text-3xl font-bold text-[#5b1a30]">{reportData.stats.totalStudents}</div>
              </div>
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Enrolled</div>
                <div className="text-3xl font-bold text-green-600">{reportData.stats.enrolled}</div>
              </div>
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Pending</div>
                <div className="text-3xl font-bold text-yellow-600">{reportData.stats.pending}</div>
              </div>
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Avg. Score</div>
                <div className="text-3xl font-bold text-[#5b1a30]">{reportData.stats.averageScore.toFixed(2)}</div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Passed</div>
                <div className="text-3xl font-bold text-blue-600">{reportData.stats.passed}</div>
              </div>
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Failed</div>
                <div className="text-3xl font-bold text-red-600">{reportData.stats.failed}</div>
              </div>
              <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm">
                <div className="text-sm text-[#8b4a5d] font-medium mb-2">Interviewed</div>
                <div className="text-3xl font-bold text-[#5b1a30]">{reportData.stats.interviewed}</div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-rose-200 overflow-auto shadow-[0_12px_24px_rgba(139,23,47,0.08)]">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-rose-50 text-[#4b1d2d]">
                  <tr className="text-left">
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Course</th>
                    <th className="px-5 py-3">Enrollment Status</th>
                    <th className="px-5 py-3">Interview Status</th>
                    <th className="px-5 py-3">Interview Date</th>
                    <th className="px-5 py-3">Exam Score</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.students && reportData.students.length > 0 ? (
                    reportData.students.map((student, idx) => (
                      <tr key={student._id || idx} className="border-t border-rose-100 hover:bg-rose-50">
                        <td className="px-5 py-3 text-[#4b1d2d] font-medium">{student.studentName}</td>
                        <td className="px-5 py-3 text-[#4b1d2d]">{student.email || '-'}</td>
                        <td className="px-5 py-3 text-[#4b1d2d]">{student.course || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            student.enrollmentStatus === 'ENROLLED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {student.enrollmentStatus || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={getStatusBadge(toUiStatus(student.status || ''))}>{toUiStatus(student.status || '')}</span>
                        </td>
                        <td className="px-5 py-3 text-[#4b1d2d]">{student.interviewDate}</td>
                        <td className="px-5 py-3 text-[#4b1d2d]">{typeof student.examScore === 'number' ? student.examScore : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-4 text-center text-[#7c3a4a]">
                        No students in this batch
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-[#7c3a4a]">
            {selectedBatch ? 'Click "Generate Report" to view the report' : 'Select a batch and click "Generate Report" to view the report'}
          </div>
        )}
      </main>
    </div>
  )
}
