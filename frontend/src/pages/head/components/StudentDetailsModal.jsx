import React from 'react'

export default function StudentDetailsModal({
  isOpen,
  selectedStudent,
  isEditing,
  formValues,
  setFormValues,
  batches,
  closeModal,
  handleEditSave,
}) {
  if (!isOpen || !selectedStudent) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[600px] p-7 mx-auto border-2 border-[#6b2b2b]">
        <div className="relative text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
          <button onClick={closeModal} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex justify-center mt-4">
            <div className="w-24 h-24 bg-gradient-to-b from-white/70 to-pink-200 rounded-full flex items-center justify-center shadow-[inset_0_6px_12px_rgba(0,0,0,0.06)] relative">
              <div className="absolute w-20 h-20 rounded-full bg-gradient-to-b from-white to-pink-100 flex items-center justify-center shadow-md border border-white/50"></div>
              <svg className="w-8 h-8 text-pink-600 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">First Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={isEditing && formValues ? formValues.firstName : selectedStudent.firstName}
                  onChange={(e) => setFormValues(prev => ({...prev, firstName: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Last Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={isEditing && formValues ? formValues.lastName : selectedStudent.lastName}
                  onChange={(e) => setFormValues(prev => ({...prev, lastName: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Batch</label>
              <div className="relative">
                <select
                  value={isEditing && formValues ? (formValues.batchId || '') : (selectedStudent.batchId || '')}
                  onChange={(e) => {
                    const bid = e.target.value || undefined
                    const b = batches.find(x => x.id === bid)
                    setFormValues(prev => ({
                      ...prev,
                      batchId: bid,
                      batch: b ? String(b.year) : (prev?.batch || ''),
                      interviewer: b ? (b.interviewer || '') : (prev?.interviewer || ''),
                    }))
                  }}
                  disabled={!isEditing}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select batch…</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{`${b.code} (${b.year})`}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Contact #</label>
              <div className="relative">
                <input
                  type="text"
                  value={isEditing && formValues ? formValues.contact : selectedStudent.contact}
                  onChange={(e) => setFormValues(prev => ({...prev, contact: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={isEditing && formValues ? formValues.email : selectedStudent.email}
                  onChange={(e) => setFormValues(prev => ({...prev, email: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Interviewer</label>
              <div className="relative">
                <input
                  type="text"
                  value={isEditing && formValues ? formValues.interviewer : selectedStudent.interviewer}
                  onChange={(e) => setFormValues(prev => ({...prev, interviewer: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Interview Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={isEditing && formValues ? (formValues.interviewDate || '') : (selectedStudent.interviewDate || '')}
                  onChange={(e) => setFormValues(prev => ({ ...prev, interviewDate: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  disabled={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Status</label>
              <div className="relative">
                <select
                  value={isEditing && formValues ? (formValues.status || 'Pending') : (selectedStudent.status || 'Pending')}
                  onChange={(e) => setFormValues(prev => ({...prev, status: e.target.value}))}
                  disabled={!isEditing}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="Pending">Pending</option>
                  <option value="Interviewed">Interviewed</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Enrolled">Enrolled</option>
                  <option value="AWOL">AWOL</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-white font-semibold text-sm text-left">Exam Score</label>
              <div className="relative">
                <input
                  type="number"
                  value={isEditing && formValues ? (formValues.examScore ?? '') : (selectedStudent.examScore ?? '')}
                  onChange={(e) => setFormValues(prev => ({...prev, examScore: e.target.value}))}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                  readOnly={!isEditing}
                />
                {isEditing && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6L21 11l-6-6-6 6z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={closeModal} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-5 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Close</button>
            <button onClick={handleEditSave} className="bg-[#6b0000] text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{isEditing ? 'Save' : 'Edit'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
