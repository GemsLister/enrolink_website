import React from 'react'

export default function BatchFilters({
  query,
  setQuery,
  batchOptions,
  statusOptions,
  interviewerOptions,
  filterBatch,
  setFilterBatch,
  filterStatus,
  setFilterStatus,
  filterInterviewer,
  setFilterInterviewer,
  selectedIds,
  handleDeleteSelected,
  handleAddBatch,
}) {
  return (
    <>
      <div className="mb-6 max-w-xl">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">Filter by:</span>
          <select value={filterBatch} onChange={(e)=>setFilterBatch(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {batchOptions.map(opt => (<option key={opt} value={opt}>{`Batch: ${opt}`}</option>))}
          </select>
          <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {statusOptions.map(opt => (<option key={opt} value={opt}>{`Status: ${opt}`}</option>))}
          </select>
          <select value={filterInterviewer} onChange={(e)=>setFilterInterviewer(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {interviewerOptions.map(opt => (<option key={opt} value={opt}>{`Interviewer: ${opt}`}</option>))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4" />
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium">Delete ({selectedIds.size})</button>
            )}
            <button onClick={handleAddBatch} className="bg-red-800 text-white px-6 py-2 rounded-lg hover:bg-red-900 transition-colors duration-200 font-medium">Add Batch</button>
          </div>
        </div>
      </div>
    </>
  )
}
