import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useApi } from '../../../hooks/useApi'

export default function AddBatchModal({ isOpen, setIsOpen, addBatchValues, setAddBatchValues, addBatchLoading, submitAddBatch, submitAddBatchAndImport, allowInterviewer = true }) {
  const { token } = useAuth()
  const api = useApi(token)
  const [officers, setOfficers] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await api.get('/officers/interviewers')
        if (active) setOfficers(res.rows || [])
      } catch (_) { if (active) setOfficers([]) }
    }
    if (isOpen) load()
    return () => { active = false }
  }, [isOpen, api])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-md p-8 mx-auto relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#6b2b2b]">Add Batch</h2>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          aria-label="Close" 
          className="absolute top-6 right-6 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#6b2b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="space-y-4">
          <div className="mb-6">
            <label className="block text-[#6b2b2b] font-semibold text-sm mb-2 text-left">Name</label>
            <input 
              className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b]" 
              value={addBatchValues.name || ''} 
              onChange={(e) => setAddBatchValues(v => ({ ...v, name: e.target.value }))} 
              placeholder="Batch name" 
            />
          </div>
          {allowInterviewer && (
            <div className="mb-6 relative">
              <label className="block text-[#6b2b2b] font-semibold text-sm mb-2 text-left">Interviewer</label>
              <select 
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b] appearance-none" 
                value={addBatchValues.interviewer || ''} 
                onChange={(e) => setAddBatchValues(v => ({ ...v, interviewer: e.target.value }))}
              >
                <option value="">Select Interviewer</option>
                {officers.map(officer => (
                  <option key={officer._id} value={officer.name || officer.email}>
                    {officer.name || officer.email}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 top-1/2 text-gray-600">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
          <div className="mb-8">
            <label className="block text-[#6b2b2b] font-semibold text-sm mb-2 text-left">Status</label>
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-[#6b2b2b]" 
                value={addBatchValues.status} 
                onChange={(e) => setAddBatchValues(v => ({ ...v, status: e.target.value }))}
              >
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={submitAddBatch} 
            disabled={addBatchLoading} 
            className="bg-[#6b2b2b] hover:bg-[#8b3b3b] text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200 w-full"
          >
            {addBatchLoading ? 'Adding…' : 'ADD'}
          </button>
        </div>
      </div>
    </div>
  )
}
