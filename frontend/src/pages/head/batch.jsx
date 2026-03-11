import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { getCategoryBadge } from '../../utils/status'
import { useBatchManagement } from './hooks/useBatchManagement'
import { useApi } from '../../hooks/useApi'
import AddPassedStudentsModal from './components/AddPassedStudentsModal'
import ScrollableTableContainer from '../../components/ScrollableTableContainer'

export default function BatchPage() {
  const { isAuthenticated, user, token } = useAuth()
  const navigate = useNavigate()
  const api = useApi(token)
  const { id } = useParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const {
    batches,
    selectedBatch,
    members,
    membersLoading,
    showMembers,
    setShowMembers,
    showAdd,
    setShowAdd,
    addValues,
    setAddValues,
    handleAddStudentSubmit,
    loadMembers,
    handleRowClick,
  } = useBatchManagement(token, { allowInterviewer: user?.role === 'DEPT_HEAD' })
  const [membersQuery, setMembersQuery] = useState('')

  useEffect(() => {
    if (id && batches && batches.length) {
      const b = batches.find(x => x.id === id)
      if (b) {
        handleRowClick(b)
        setShowMembers(true)
        loadMembers(b.id)
      }
    }
  }, [id, batches])

  const filteredMembers = (membersQuery || '').trim()
    ? members.filter((m) => {
        const first = String(m.firstName || '').trim().toLowerCase()
        const last = String(m.lastName || '').trim().toLowerCase()
        const email = String(m.email || '').trim().toLowerCase()
        const q = String(membersQuery || '').trim().toLowerCase()
        const combos = [
          first,
          last,
          `${last}, ${first}`,
          `${first} ${last}`,
          email,
        ].filter(Boolean)
        return combos.some((c) => c.includes(q))
      })
    : members

  const generateReport = async () => {
    if (!selectedBatch) return
    try {
      setReportLoading(true)
      const res = await api.get(`/reports/batch/report?batch=${encodeURIComponent(selectedBatch.code)}`)
      setReportData(res)
      setShowReportModal(true)
    } catch (e) {
      alert('Failed to generate report: ' + (e.message || 'Unknown error'))
    } finally {
      setReportLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedBatch) return
    try {
      const res = await fetch(`/api/reports/batch/pdf?batch=${encodeURIComponent(selectedBatch.code)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${selectedBatch.code}-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to download PDF: ' + (e.message || 'Unknown error'))
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'DEPT_HEAD' && user.role !== 'OFFICER')) return <Navigate to="/" replace />

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden">
        <div className="h-full flex flex-col px-10 pt-10 pb-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">{selectedBatch ? `BATCH-${selectedBatch.code}` : 'BATCH'}</h1>
              <p className="text-base text-[#8b4a5d] mt-3">List of Students</p>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <input
              type="text"
              value={membersQuery}
              onChange={(e) => setMembersQuery(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-full border border-rose-200 bg-white px-5 py-3 text-sm text-[#5b1a30] placeholder:text-black-300 focus:border-black-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/head/batch-management')} className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-[#c4375b] shadow-sm transition hover:border-rose-400">Back</button>
              <button onClick={generateReport} disabled={reportLoading} className="rounded-full bg-[#6b2b5f] px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#5a1f4f] disabled:opacity-50 disabled:cursor-not-allowed">{reportLoading ? 'Generating...' : 'Generate Report'}</button>
              <button onClick={() => setShowAddModal(true)} className="rounded-full bg-[#c4375b] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 hover:bg-[#a62a49]">Add Student</button>
            </div>
          </div>

        <AddPassedStudentsModal
          isOpen={showAddModal}
          selectedBatch={selectedBatch}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            try { if (window.gtag) window.gtag('event', 'batch_add_student', { batch_id: selectedBatch?.id }) } catch (_) {}
            loadMembers(selectedBatch?.id)
          }}
        />

        <div className="flex-1 rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-0 flex flex-col min-h-0">
          <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
          <div className="flex-1 rounded-[32px] bg-white overflow-hidden border border-[#f7d6d6] flex flex-col min-h-0">
            <ScrollableTableContainer wrapperClassName="flex-1 min-h-0" overflowClass="flex-1 overflow-auto" className="no-scrollbar">
              <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-[#f9c4c4] text-[#5b1a30] text-xs font-semibold uppercase sticky top-0 z-10">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Interview Date</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-600">Loading students…</td></tr>
                )}
                {!membersLoading && filteredMembers.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-600">No students in this batch</td></tr>
                )}
                {!membersLoading && filteredMembers.map((m) => (
                  <tr key={m.id} className="border-t border-[#f3d5d5] odd:bg-white even:bg-[#fff2f4]">
                    <td className="px-4 py-2 text-[#5b1a30]">{`${m.lastName}, ${m.firstName}`}</td>
                    <td className="px-4 py-2"><span className={getCategoryBadge(m.recordCategory)}>{m.recordCategory || 'Applicant'}</span></td>
                    <td className="px-4 py-2 text-[#7c3a4a]">{m.email}</td>
                    <td className="px-4 py-2 text-[#7c3a4a]">{m.interviewDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </ScrollableTableContainer>
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-gradient-to-b from-red-300 to-pink-100 px-8 py-6 flex justify-between items-center border-b border-rose-200">
                <h2 className="text-2xl font-bold text-[#5b1a30]">Batch Report - {selectedBatch?.code}</h2>
                <div className="flex items-center gap-3">
                  <button onClick={handleDownloadPdf} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition font-medium text-sm">Download PDF</button>
                  <button onClick={() => setShowReportModal(false)} className="text-[#5b1a30] hover:text-[#3d0a1f] font-bold text-2xl">×</button>
                </div>
              </div>
              <div className="px-8 py-8">
                {reportData && (
                  <div className="text-center text-[#7c3a4a]">
                    <p className="mb-6">Report generated successfully for {selectedBatch?.code}</p>
                    <p className="text-sm">Click "Download PDF" to save the report</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
