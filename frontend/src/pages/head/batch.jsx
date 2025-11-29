import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { getStatusBadge } from '../../utils/status'
import { useBatchManagement } from './hooks/useBatchManagement'
import AddPassedStudentsModal from './components/AddPassedStudentsModal'

export default function BatchPage() {
  const { isAuthenticated, user, token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [showAddModal, setShowAddModal] = useState(false)
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

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'DEPT_HEAD' && user.role !== 'OFFICER')) return <Navigate to="/" replace />

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#f7f1f2] px-10 py-8 overflow-y-auto h-[100dvh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">{selectedBatch ? `BATCH-${selectedBatch.code}` : 'BATCH'}</h1>
            <p className="text-md text-[#2f2b33] mt-3">List of Students</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/head/batch-management')} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium">Back</button>
            <button onClick={() => setShowAddModal(true)} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium">Add Student</button>
          </div>
        </div>

        <AddPassedStudentsModal
          isOpen={showAddModal}
          selectedBatch={selectedBatch}
          onClose={() => setShowAddModal(false)}
          onAdded={() => loadMembers(selectedBatch?.id)}
        />

        <div className="mt-6 bg-white rounded-2xl border border-rose-200 overflow-auto shadow-[0_12px_24px_rgba(139,23,47,0.08)]">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-rose-50 text-[#4b1d2d] sticky top-0">
              <tr className="text-left">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Interview Date</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-600">Loading students…</td></tr>
              )}
              {!membersLoading && members.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-600">No students in this batch</td></tr>
              )}
              {!membersLoading && members.map((m) => (
                <tr key={m.id} className="border-t border-rose-100">
                  <td className="px-5 py-3 text-gray-800">{`${m.lastName}, ${m.firstName}`}</td>
                  <td className="px-5 py-3"><span className={getStatusBadge(m.status)}>{m.status}</span></td>
                  <td className="px-5 py-3 text-gray-600">{m.email}</td>
                  <td className="px-5 py-3 text-gray-600">{m.interviewDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
