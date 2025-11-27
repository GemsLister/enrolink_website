import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useApi } from '../../../hooks/useApi'

export default function AddBatchModal({ isOpen, setIsOpen, addBatchValues, setAddBatchValues, addBatchLoading, submitAddBatch, submitAddBatchAndImport, allowInterviewer = true }) {
  const { token } = useAuth()
  const api = useApi(token)
  const [interviewers, setInterviewers] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await api.get('/officers/interviewers')
        if (active) setInterviewers(res.rows || [])
      } catch (_) { if (active) setInterviewers([]) }
    }
    if (isOpen) load()
    return () => { active = false }
  }, [isOpen, api])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w/full max-w-[520px] p-7 mx-auto border-2 border-[#6b2b2b]">
        <div className="relative text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add Batch</h2>
          <button onClick={() => setIsOpen(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <label className="text-white font-semibold text-sm text-left">Academic Year</label>
            <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={addBatchValues.year} onChange={(e)=>setAddBatchValues(v=>({ ...v, year: e.target.value }))} placeholder="YYYY" />
          </div>
          {allowInterviewer && (
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Interviewer</label>
              <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={addBatchValues.interviewer || ''} onChange={(e)=>setAddBatchValues(v=>({ ...v, interviewer: e.target.value }))}>
                <option value="">Name (optional)</option>
                {interviewers.map(iv => (
                  <option key={iv._id} value={iv.name || iv.email}>{iv.name || iv.email}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <label className="text-white font-semibold text-sm text-left">Status</label>
            <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={addBatchValues.status} onChange={(e)=>setAddBatchValues(v=>({ ...v, status: e.target.value }))}>
              <option value="PENDING">Pending</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={()=>setIsOpen(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-5 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
          <button onClick={submitAddBatchAndImport} disabled={addBatchLoading} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{addBatchLoading ? 'Creating…' : 'Save & Import'}</button>
          <button onClick={submitAddBatch} disabled={addBatchLoading} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{addBatchLoading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
