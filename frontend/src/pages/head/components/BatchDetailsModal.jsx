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
}) {
  if (!isOpen || !selectedBatch) return null
  const { token, user } = useAuth()
  const api = useApi(token)
  const [scoresMap, setScoresMap] = useState(new Map())
  const batchCode = selectedBatch?.code
  const canEditInterviewer = !!user && user.role === 'DEPT_HEAD'
  const [interviewers, setInterviewers] = useState([])
  const [localInterviewer, setLocalInterviewer] = useState(selectedBatch?.interviewer || '')

  useEffect(() => {
    let active = true
    async function loadScores() {
      if (!showMembers || !batchCode) return
      try {
        const res = await api.get(`/reports?batch=${encodeURIComponent(batchCode)}`)
        const map = new Map()
        ;(res.rows || []).forEach(r => {
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
  useEffect(() => { setLocalInterviewer(selectedBatch?.interviewer || '') }, [selectedBatch])
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
  async function saveInterviewer(value) {
    try {
      setLocalInterviewer(value)
      await api.put(`/batches/${selectedBatch.id}`, { interviewer: value })
    } catch (_) {}
  }
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[600px] p-7 mx-auto border-2 border-[#6b2b2b] max-h-[85vh] overflow-y-auto">
        <div className="relative text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Batch Details</h2>
          <button onClick={closeModal} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex justify-center mt-4">
            <div className="w-24 h-24 bg-gradient-to-b from-white/70 to-pink-200 rounded-full flex items-center justify-center shadow-[inset_0_6px_12px_rgba(0,0,0,0.06)] relative">
              <div className="absolute w-20 h-20 rounded-full bg-gradient-to-b from-white to-pink-100 flex items-center justify-center shadow-md border border-white/50"></div>
              <svg className="w-8 h-8 text-pink-600 relative z-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="grid grid-cols-[120px_1fr] items-center gap-4"><label className="text-white font-semibold text-sm text-left">Batch Code</label><input readOnly className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={selectedBatch.code} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4"><label className="text-white font-semibold text-sm text-left">Academic Year</label><input readOnly className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={selectedBatch.year} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4"><label className="text-white font-semibold text-sm text-left">Students</label><input readOnly className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={selectedBatch.studentsCount} /></div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Interviewer</label>
              {canEditInterviewer ? (
                <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={localInterviewer} onChange={(e)=>saveInterviewer(e.target.value)}>
                  <option value="">Name (optional)</option>
                  {interviewers.map(iv => (
                    <option key={iv._id} value={iv.name || iv.email}>{iv.name || iv.email}</option>
                  ))}
                </select>
              ) : (
                <input readOnly className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={localInterviewer} />
              )}
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4"><label className="text-white font-semibold text-sm text-left">Status</label><input readOnly className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={selectedBatch.status} /></div>
          </div>
          <div className="mt-4">
            <div className="flex gap-2 flex-wrap">
              <button onClick={async () => { const next = !showMembers; setShowMembers(next); if (next && members.length === 0 && selectedBatch?.id) { await loadMembers(selectedBatch.id) } }} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">{showMembers ? 'Hide Members' : 'View Members'}</button>
              <button onClick={() => openImportForBatch(selectedBatch)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Import</button>
              <button onClick={() => setShowAdd(v => !v)} className="bg-[#6b0000] text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{showAdd ? 'Cancel' : 'Add Student'}</button>
            </div>
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
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="First Name" value={addValues.firstName} onChange={(e)=>setAddValues(v=>({ ...v, firstName: e.target.value }))} />
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Last Name" value={addValues.lastName} onChange={(e)=>setAddValues(v=>({ ...v, lastName: e.target.value }))} />
                  <input type="email" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Email (optional)" value={addValues.email} onChange={(e)=>setAddValues(v=>({ ...v, email: e.target.value }))} />
                  <input type="text" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Contact (optional)" value={addValues.contact} onChange={(e)=>setAddValues(v=>({ ...v, contact: e.target.value }))} />
                  <input type="date" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Interview Date" value={addValues.interviewDate || ''} onChange={(e)=>setAddValues(v=>({ ...v, interviewDate: e.target.value }))} />
                  <input type="number" className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" placeholder="Exam Score" value={addValues.examScore || ''} onChange={(e)=>setAddValues(v=>({ ...v, examScore: e.target.value }))} />
                  <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={addValues.status} onChange={(e)=>setAddValues(v=>({ ...v, status: e.target.value }))}>
                    <option value="Pending">Pending</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="AWOL">AWOL</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={()=>setShowAdd(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
                  <button onClick={handleAddStudentSubmit} disabled={!addValues.firstName.trim() || !addValues.lastName.trim()} className="bg-[#6b0000] disabled:opacity-60 text-white px-4 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={closeModal} className="bg-[#6b0000] text-white px-15 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
