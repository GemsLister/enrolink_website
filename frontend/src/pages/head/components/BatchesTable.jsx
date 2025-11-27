import React from 'react'

export default function BatchesTable({
  batchesLoading,
  displayedBatches,
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
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '48px' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '21%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <thead className="bg-red-200">
          <tr>
            <th className="px-6 py-4 text-left">
              <input type="checkbox" className="rounded border-gray-300" checked={displayedBatches.length > 0 && allDisplayedSelected} onChange={(e) => toggleAllDisplayed(e.target.checked)} />
            </th>
            <th onClick={() => onHeaderSort('name')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Batch Code {sortField==='name' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('batch')} className="px-6 py-4 text-center font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Academic Year {sortField==='batch' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('students')} className="px-6 py-4 text-center font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Students {sortField==='students' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('interviewer')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Interviewer {sortField==='interviewer' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('status')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Status {sortField==='status' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {batchesLoading && (<tr><td colSpan={6} className="px-6 py-6 text-center text-gray-600">Loading batches…</td></tr>)}
          {!batchesLoading && displayedBatches.length === 0 && (<tr><td colSpan={6} className="px-6 py-10 text-center text-gray-600">No batches found</td></tr>)}
          {!batchesLoading && displayedBatches.map((batch, index) => (
            <tr key={batch.id} className={`border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} onClick={() => handleRowClick(batch)}>
              <td className="px-6 py-4">
                <input type="checkbox" className="rounded border-gray-300" checked={selectedIds.has(batch.id)} onChange={(e) => toggleRow(batch.id, e.target.checked)} onClick={(e) => e.stopPropagation()} />
              </td>
              <td className="px-6 py-4 text-gray-800 font-medium truncate">{batch.code}</td>
              <td className="px-6 py-4 text-gray-600 truncate text-center">{batch.year}</td>
              <td className="px-6 py-4 text-gray-600 truncate text-center">{batch.studentsCount}</td>
              <td className="px-6 py-4 text-gray-600 truncate">{batch.interviewer}</td>
              <td className="px-6 py-4"><span className={getStatusBadge(batch.status)}>{batch.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
