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
  statusOptions = [],
  onChangeStatus,
  }) {
  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${mm}/${dd}/${yy}`
  }
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '48px' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead className="bg-red-300">
          <tr>
            <th className="px-6 py-4 text-left">
              <input type="checkbox" className="rounded border-gray-300" checked={displayedBatches.length > 0 && allDisplayedSelected} onChange={(e) => toggleAllDisplayed(e.target.checked)} />
            </th>
            <th onClick={() => onHeaderSort('name')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Batch ID {sortField==='name' && (<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('interviewer')} className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Interviewer {sortField==='interviewer' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('date')} className="px-6 py-4 text-center font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Date Created {sortField==='date' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th onClick={() => onHeaderSort('students')} className="px-6 py-4 text-center font-semibold text-gray-800 cursor-pointer select-none">
              <span className="inline-flex items-center gap-1">Students {sortField==='students' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir==='asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}</span>
            </th>
            <th className="px-6 py-4 text-left font-semibold text-gray-800">
              <span className="inline-flex items-center gap-1">Status</span>
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
              <td className="px-6 py-4 text-gray-600 truncate">{batch.interviewer}</td>
              <td className="px-6 py-4 text-gray-600 truncate text-center">{fmtDate(batch.createdAt)}</td>
              <td className="px-6 py-4 text-gray-600 truncate text-center">{batch.studentsCount}</td>
              <td className="px-6 py-4">
                <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select className="px-3 py-1 pr-8 rounded-full bg-pink-100 text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none border border-pink-200 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat" value={batch.status} onChange={(e) => onChangeStatus && onChangeStatus(batch, e.target.value)}>
                    {statusOptions.filter(s => s !== 'All').map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
