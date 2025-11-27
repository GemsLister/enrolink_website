import React from 'react'

export default function StudentTable({
  studentsLoading,
  displayedStudents,
  batches,
  allDisplayedSelected,
  toggleAllDisplayed,
  selectedIds,
  toggleRow,
  handleRowClick,
  sortField,
  sortDir,
  onHeaderSort,
  getStatusBadge,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-red-200">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={displayedStudents.length > 0 && allDisplayedSelected}
                  onChange={(e) => toggleAllDisplayed(e.target.checked)}
                />
              </th>
              <th onClick={() => onHeaderSort('name')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Name {sortField==='name' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
              <th onClick={() => onHeaderSort('batch')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Batch {sortField==='batch' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
              <th onClick={() => onHeaderSort('date')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Interview Date {sortField==='date' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
              <th onClick={() => onHeaderSort('interviewer')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Interviewer {sortField==='interviewer' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
              <th onClick={() => onHeaderSort('status')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Status {sortField==='status' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
              <th onClick={() => onHeaderSort('score')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
                <span className="inline-flex items-center gap-1">Exam Score {sortField==='score' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>
      <div className="">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <tbody>
            {studentsLoading && (
              <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-600">Loading students…</td></tr>
            )}
            {!studentsLoading && displayedStudents.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-600">No students found</td></tr>
            )}
            {!studentsLoading && displayedStudents.map((student, index) => (
              <tr
                key={student.id}
                className={`border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                onClick={() => handleRowClick(student)}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedIds.has(student.id)}
                    onChange={(e) => toggleRow(student.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-6 py-4 text-gray-800 font-medium truncate">{student.firstName} {student.lastName}</td>
                <td className="px-6 py-4 text-gray-600 truncate">{(batches.find(b => b.id === student.batchId)?.code) || student.batch}</td>
                <td className="px-6 py-4 text-gray-600 truncate">{student.interviewDate}</td>
                <td className="px-6 py-4 text-gray-600 truncate">{student.interviewer}</td>
                <td className="px-6 py-4">
                  <span className={getStatusBadge(student.status)}>
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-800 truncate">{student.examScore ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
