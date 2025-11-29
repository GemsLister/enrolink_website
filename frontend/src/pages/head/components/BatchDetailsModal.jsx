import React, { useEffect, useMemo, useState } from 'react'
import { getStatusBadge } from '../../../utils/status'
import { useAuth } from '../../../hooks/useAuth'
import { useApi } from '../../../hooks/useApi'

export default function BatchDetailsModal({
  isOpen,
  selectedBatch,
  closeModal,
  showMembers,
  setShowMembers,
  members,
  membersLoading,
  openImportForBatch,
  showAdd,
  setShowAdd,
  addValues,
  setAddValues,
  handleAddStudentSubmit,
  loadMembers,
  saveBatchEdits,
}) {
  if (!isOpen || !selectedBatch) return null
  const { token, user } = useAuth()
  const api = useApi(token)
  const [scoresMap, setScoresMap] = useState(new Map())
  const batchCode = selectedBatch?.code
  const canEditInterviewer = !!user && user.role === 'DEPT_HEAD'
  const [interviewers, setInterviewers] = useState([])
  const [localInterviewer, setLocalInterviewer] = useState(selectedBatch?.interviewer || '')
  const [editInterviewer, setEditInterviewer] = useState(selectedBatch?.interviewer || '')
  const [editStatus, setEditStatus] = useState(selectedBatch?.status || 'ONGOING')

  useEffect(() => {
    let active = true
    async function loadScores() {
      if (!showMembers || !batchCode) return
      try {
        const res = await api.get(`/reports?batch=${encodeURIComponent(batchCode)}`)
        const map = new Map()
          ; (res.rows || []).forEach(r => {
            const name = (r.studentName || '').toString().trim().toLowerCase()
            if (!name) return
            const score = typeof r.examScore === 'number' ? r.examScore : (r.examScore ?? undefined)
            map.set(name, score)
          })
        if (active) setScoresMap(map)
      } catch (_) {
        if (active) setScoresMap(new Map())
      }
    }
    loadScores()
    return () => { active = false }
  }, [showMembers, batchCode, api])
  useEffect(() => {
    setLocalInterviewer(selectedBatch?.interviewer || '')
    setEditInterviewer(selectedBatch?.interviewer || '')
    setEditStatus(selectedBatch?.status || 'ONGOING')
  }, [selectedBatch])
  useEffect(() => {
    let active = true
    async function loadInterviewers() {
      if (!canEditInterviewer) return
      try {
        const res = await api.get('/officers/interviewers')
        if (active) setInterviewers(res.rows || [])
      } catch (_) { if (active) setInterviewers([]) }
    }
    loadInterviewers()
    return () => { active = false }
  }, [api, canEditInterviewer])
  async function onSave() {
    if (!canEditInterviewer) return
    try {
      await saveBatchEdits(selectedBatch.id, editInterviewer, editStatus)
      setLocalInterviewer(editInterviewer)
      closeModal()
    } catch (_) { }
  }
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-md p-8 mx-auto max-h-[85vh] overflow-y-auto relative">
        <div className="grid grid-cols-3 text-center mb-6">

          <div className='col-2 w-full'>
            <h2 className="text-2xl font-bold text-[#6b2b2b]">Edit Batch</h2>
          </div>
          <div className='col-3 flex justify-end w-full'>
            <button onClick={closeModal} aria-label="Close" className="text-gray-700 hover:text-gray-900 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#6b2b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className='flex flex-col gap-2'><h2 className='font-semibold text-[#600000]'>Name</h2><input className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b]" placeholder="Enter batch name" value={editInterviewer} onChange={(e) => setEditInterviewer(e.target.value)} disabled={!canEditInterviewer} /></div>
            <div className='flex flex-col gap-2'>
              <h2 className='font-semibold text-[#600000]'>Officer</h2>
              <select className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b] appearance-none" value={editInterviewer} onChange={(e) => setEditInterviewer(e.target.value)} disabled={!canEditInterviewer}>
                <option value="">Select Interviewer</option>
                {interviewers.map(iv => (
                  <option key={iv._id} value={iv.name || iv.email}>{iv.name || iv.email}</option>
                ))}
              </select>
            </div>
            <div className='flex flex-col gap-2'>
              <h2 className='font-semibold text-[#600000]'>Status</h2>
              <select className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b]" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} disabled={!canEditInterviewer}>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="flex justify-center mt-2">
              <button onClick={onSave} disabled={!canEditInterviewer} className="bg-[#6b2b2b] hover:bg-[#8b3b3b] text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200 w-full disabled:opacity-60">Save</button>
            </div>
          </div>
          <div className="mt-4">
            {/* <div className="flex gap-2 flex-wrap">
              <button onClick={async () => { const next = !showMembers; setShowMembers(next); if (next && members.length === 0 && selectedBatch?.id) { await loadMembers(selectedBatch.id) } }} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">{showMembers ? 'Hide Members' : 'View Members'}</button>
              <button onClick={() => openImportForBatch(selectedBatch)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Import</button>
              <button onClick={() => setShowAdd(v => !v)} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{showAdd ? 'Cancel' : 'Add Student'}</button>
            </div> */}
            {showMembers && (
              <div className="mt-3 bg-white rounded-xl border border-pink-200 max-h-64 overflow-auto">
                {membersLoading ? (
                  <div className="p-4 text-sm text-gray-600">Loading members…</div>
                ) : members.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No members in this batch.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-pink-50 text-gray-700 sticky top-0"><tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Interview Date</th><th className="text-left px-4 py-2">Exam Score</th></tr></thead>
                    <tbody>
                      {members.map(m => {
                        const n1 = `${m.firstName} ${m.lastName}`.trim().toLowerCase()
                        const n2 = `${m.lastName} ${m.firstName}`.trim().toLowerCase()
                        const score = scoresMap.get(n1) ?? scoresMap.get(n2)
                        return (
                          <tr key={m.id} className="border-t border-pink-100">
                            <td className="px-4 py-2 text-gray-800">{`${m.lastName}, ${m.firstName}`}</td>
                            <td className="px-4 py-2"><span className={getStatusBadge(m.status)}>{m.status}</span></td>
                            <td className="px-4 py-2 text-gray-600">{m.email}</td>
                            <td className="px-4 py-2 text-gray-600">{m.interviewDate || '-'}</td>
                            <td className="px-4 py-2 text-gray-800">{score ?? '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {showAdd && (
              <div className="mt-3 bg-white rounded-xl border border-pink-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="First Name" value={addValues.firstName} onChange={(e) => setAddValues(v => ({ ...v, firstName: e.target.value }))} />
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Last Name" value={addValues.lastName} onChange={(e) => setAddValues(v => ({ ...v, lastName: e.target.value }))} />
                  <input type="email" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Email (optional)" value={addValues.email} onChange={(e) => setAddValues(v => ({ ...v, email: e.target.value }))} />
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Contact (optional)" value={addValues.contact} onChange={(e) => setAddValues(v => ({ ...v, contact: e.target.value }))} />
                  <input type="date" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Interview Date" value={addValues.interviewDate || ''} onChange={(e) => setAddValues(v => ({ ...v, interviewDate: e.target.value }))} />
                  <input type="number" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Exam Score" value={addValues.examScore || ''} onChange={(e) => setAddValues(v => ({ ...v, examScore: e.target.value }))} />
                  <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={addValues.status} onChange={(e) => setAddValues(v => ({ ...v, status: e.target.value }))}>
                    <option value="Pending">Pending</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="AWOL">AWOL</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setShowAdd(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
                  <button onClick={handleAddStudentSubmit} disabled={!addValues.firstName.trim() || !addValues.lastName.trim()} className="bg-[#6b0000] disabled:opacity-60 text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* <div className="flex justify-center gap-4 mt-6">
          <button onClick={closeModal} className="bg-[#6b0000] text-white px-15 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm w-full">Close</button>
        </div> */}
      </div>
    </div>
  )
}
