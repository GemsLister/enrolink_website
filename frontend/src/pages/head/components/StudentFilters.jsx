import React from 'react'
import UserChip from '../../../components/UserChip'

export default function StudentFilters({
  title,
  activeChips,
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
  sortField,
  setSortField,
  sortDir,
  setSortDir,
  selectedIds,
  handleDeleteSelected,
  handleAddStudent,
  handleImport,
}) {
  return (
    <>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-bold text-red-900 mb-2 mt-[35px]">{title}</h1>
          <p className="text-lg text-gray-1000 font-bold mt-[20px]">List of 1st Year Applicants</p>
        </div>

        <div className="mt-[-50px]">
          <UserChip />
        </div>
      </div>

      {activeChips?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeChips.map((c, i) => (
            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-200 text-gray-800">{c}</span>
          ))}
        </div>
      )}

      <div className="mb-6 max-w-xl">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">Filter by:</span>
          <select value={filterBatch} onChange={(e)=>setFilterBatch(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {batchOptions.map(opt => (
              <option key={opt} value={opt}>{`Batch: ${opt}`}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{`Status: ${opt}`}</option>
            ))}
          </select>
          <select value={filterInterviewer} onChange={(e)=>setFilterInterviewer(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            {interviewerOptions.map(opt => (
              <option key={opt} value={opt}>{`Interviewer: ${opt}`}</option>
            ))}
          </select>
          <select className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
            <option>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">Sort by:</span>
            <select value={sortField} onChange={(e)=>setSortField(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
              <option value="name">{`Sort: Name`}</option>
              <option value="batch">{`Sort: Batch`}</option>
              <option value="date">{`Sort: Interview Date`}</option>
              <option value="interviewer">{`Sort: Interviewer`}</option>
              <option value="status">{`Sort: Status`}</option>
            </select>
            <select value={sortDir} onChange={(e)=>setSortDir(e.target.value)} className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat">
              <option value="asc">{`Order: Ascending`}</option>
              <option value="desc">{`Order: Descending`}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium">
                Delete ({selectedIds.size})
              </button>
            )}
            {handleImport && (
              <button onClick={handleImport} className="bg-white text-[#6b0000] border border-[#6b2b2b] px-4 py-2 rounded-lg hover:bg-pink-50 transition-colors duration-200 font-medium">
                Import
              </button>
            )}
            <button onClick={handleAddStudent} className="bg-red-800 text-white px-6 py-2 rounded-lg hover:bg-red-900 transition-colors duration-200 font-medium">
              Add Student
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
