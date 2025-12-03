import React from 'react'

export default function BatchesTable({
  batchesLoading,
  displayedBatches,
  allDisplayedSelected,
  toggleAllDisplayed,
  selectedIds,
  toggleRow,
  handleRowClick,
  openEditModal,
  sortField,
  sortDir,
  onHeaderSort,
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
      <table className="min-w-[1200px] w-full border-collapse">
        <colgroup>
          <col style={{ width: '48px' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#f9c4c4] text-[#5b1a30] text-xs font-semibold uppercase">
            <th className="w-12 px-4 py-4 text-center sticky top-0 z-20 bg-[#f9c4c4]">
              <input type="checkbox" className="h-4 w-4 text-[#6b0000] focus:ring-[#6b0000] border-gray-300 rounded" checked={displayedBatches.length > 0 && allDisplayedSelected} onChange={(e) => toggleAllDisplayed(e.target.checked)} />
            </th>
            <th onClick={() => onHeaderSort('name')} className="text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4] cursor-pointer select-none">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  Batch ID {sortField === 'name' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir === 'asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}
                </span>
              </div>
            </th>
            <th onClick={() => onHeaderSort('interviewer')} className="text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4] cursor-pointer select-none">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  Interviewer {sortField === 'interviewer' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir === 'asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}
                </span>
              </div>
            </th>
            <th onClick={() => onHeaderSort('date')} className="text-center px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4] cursor-pointer select-none">
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  Date Created {sortField === 'date' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir === 'asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}
                </span>
              </div>
            </th>
            <th onClick={() => onHeaderSort('students')} className="text-center px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4] cursor-pointer select-none">
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  Students {sortField === 'students' && (<svg className="w-3 h-3 inline" viewBox="0 0 20 20" fill="currentColor"><path d={sortDir === 'asc' ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>)}
                </span>
              </div>
            </th>
            <th className="text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>Status</span>
              </div>
            </th>
            <th className="text-left px-4 py-4 sticky top-0 z-20 bg-[#f9c4c4]">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[12px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-open-sans)' }}>Edit</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {batchesLoading && (<tr><td colSpan={6} className="px-6 py-6 text-center text-gray-600">Loading batches…</td></tr>)}
          {!batchesLoading && displayedBatches.length === 0 && (<tr><td colSpan={6} className="px-6 py-10 text-center text-gray-600">No batches found</td></tr>)}
          {!batchesLoading && displayedBatches.map((batch, idx) => (
            <tr
              key={batch.id}
              className={`border-b border-[#f3d5d5] hover:bg-rose-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fff2f4]'} cursor-pointer`}
              onClick={() => handleRowClick(batch)}
              onDoubleClick={() => handleRowClick(batch)}
            >
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" checked={selectedIds.has(batch.id)} onChange={(e) => toggleRow(batch.id, e.target.checked)} onClick={(e) => e.stopPropagation()} />
              </td>
              <td className="px-4 py-3 text-[#5b1a30] font-medium truncate">
                <div className="inline-flex items-center gap-2">
                  <span>{batch.code}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-[#7c3a4a] truncate">{batch.interviewer}</td>
              <td className="px-4 py-3 text-[#7c3a4a] truncate text-center">{fmtDate(batch.createdAt)}</td>
              <td className="px-4 py-3 text-[#7c3a4a] truncate text-center">{batch.studentsCount}</td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select className="px-3 py-1 pr-8 rounded-full bg-pink-100 text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none border border-pink-200 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1em_1em] bg-[right_0.5em_center] bg-no-repeat" value={batch.status} onChange={(e) => onChangeStatus && onChangeStatus(batch, e.target.value)}>
                    {statusOptions.filter(s => s !== 'All').map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </td>
              <td className='px-4 py-3'>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); (openEditModal ? openEditModal(batch) : handleRowClick(batch)); }}
                  className="flex justify-center p-1 rounded-[10px] border border-gray-300 hover:bg-gray-100 text-gray-700"
                  aria-label="Edit batch"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  )
}
