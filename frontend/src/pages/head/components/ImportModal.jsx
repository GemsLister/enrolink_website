import React from 'react'

export default function ImportModal({
  isOpen,
  setIsOpen,
  importMode,
  setImportMode,
  importValues,
  setImportValues,
  batches,
  importBatchId,
  appendBatchId,
  setImportBatchId,
  setAppendBatchId,
  importCreate,
  setImportCreate,
  csvFile,
  setCsvFile,
  importLoading,
  submitImport,
  submitImportCsv,
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-3xl shadow-lg w-full max-w-[560px] p-7 mx-auto border-2 border-[#6b2b2b]">
        <div className="relative text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Import from Google Sheets</h2>
          <button onClick={() => setIsOpen(false)} aria-label="Close" className="absolute top-2 right-3 text-gray-700 hover:text-gray-900 transition-colors rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={()=>setImportMode('sheets')} className={`px-4 py-2 rounded-full text-sm font-medium border ${importMode==='sheets' ? 'bg-white text-[#6b0000] border-[#6b2b2b]' : 'bg-transparent text-white border-white/60'}`}>Google Sheets</button>
          <button onClick={()=>setImportMode('file')} className={`px-4 py-2 rounded-full text-sm font-medium border ${importMode==='file' ? 'bg-white text-[#6b0000] border-[#6b2b2b]' : 'bg-transparent text-white border-white/60'}`}>Upload File</button>
        </div>
        {importMode === 'sheets' ? (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">Google Sheets URL</label>
                <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importValues.url} onChange={(e)=>setImportValues(v=>({ ...v, url: e.target.value }))} placeholder="https://docs.google.com/spreadsheets/d/<id>/edit#gid=0" />
              </div>
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">Academic Year</label>
                <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importValues.year} onChange={(e)=>{ const newYear = e.target.value; setImportValues(v=>({ ...v, year: newYear })); setImportBatchId('') }} placeholder="YYYY" />
              </div>
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">New Interviewer</label>
                <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importCreate.interviewer} onChange={(e)=>setImportCreate(v=>({ ...v, interviewer: e.target.value }))} placeholder="Name (optional)" />
              </div>
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">New Batch Status</label>
                <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importCreate.status} onChange={(e)=>setImportCreate(v=>({ ...v, status: e.target.value }))}>
                  <option value="PENDING">Pending</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setIsOpen(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-5 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
              <button onClick={submitImport} disabled={importLoading || !importValues.url?.trim() || !importValues.year.trim() || (!appendBatchId && !importCreate.interviewer.trim())} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{importLoading ? 'Importing…' : 'Import'}</button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">File</label>
                <input type="file" accept=".csv,.CSV,text/csv,application/vnd.ms-excel,.xls,.XLS,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.XLSX" onChange={(e)=>setCsvFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} className="block text-sm text-gray-800" />
              </div>
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-white font-semibold text-sm text-left">Academic Year</label>
                <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importValues.year} onChange={(e)=>{ const newYear = e.target.value; setImportValues(v=>({ ...v, year: newYear })); setImportBatchId('') }} readOnly={!!appendBatchId} placeholder="YYYY" />
              </div>
              {!appendBatchId && (
                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-white font-semibold text-sm text-left">New Interviewer</label>
                  <input className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importCreate.interviewer} onChange={(e)=>setImportCreate(v=>({ ...v, interviewer: e.target.value }))} placeholder="Name" />
                </div>
              )}
              {!appendBatchId && (
                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-white font-semibold text-sm text-left">New Batch Status</label>
                  <select className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 w-full" value={importCreate.status} onChange={(e)=>setImportCreate(v=>({ ...v, status: e.target.value }))}>
                    <option value="PENDING">Pending</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              )}
              <div className="text-xs text-white/80">Expected columns per row: LastName, FirstName, Status, Exam Score, Interview Date, Email, Contact (first sheet for .xlsx)</div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setIsOpen(false)} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-5 py-2 rounded-full hover:bg-pink-50 transition-colors duration-200 font-medium text-sm">Cancel</button>
              <button onClick={submitImportCsv} disabled={importLoading || !csvFile || !importValues.year.trim() || (!appendBatchId && !importCreate.interviewer.trim())} className="bg-[#6b0000] disabled:opacity-60 text-white px-6 py-2 rounded-full hover:bg-[#8b0000] transition-colors duration-200 font-medium text-sm">{importLoading ? 'Importing…' : 'Import'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
