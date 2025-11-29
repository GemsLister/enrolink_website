import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { getStatusBadge } from '../../utils/status'
import { useBatchManagement } from './hooks/useBatchManagement'
import BatchFilters from './components/BatchFilters'
import BatchesTable from './components/BatchesTable'
import AddBatchModal from './components/AddBatchModal'
import ImportModal from './components/ImportModal'
import BatchDetailsModal from './components/BatchDetailsModal'

export default function BatchManagement({ embedded = false }) {
    const { isAuthenticated, user, token } = useAuth()
    const navigate = useNavigate()
    const { id: routeBatchId } = useParams()
  const {
      batches, batchesLoading, query,
      filterBatch, filterStatus, filterInterviewer,
      sortField, sortDir, selectedIds,
      batchOptions, statusOptions, interviewerOptions,
      displayedBatches, allDisplayedSelected,
      selectedBatch, isModalOpen,
      members, membersLoading,
      showMembers, setShowMembers,
      showAdd, setShowAdd,
      addValues, setAddValues,
      isAddBatchOpen, setIsAddBatchOpen, addBatchValues, setAddBatchValues, addBatchLoading, submitAddBatch, submitAddBatchAndImport,
      isImportOpen, setIsImportOpen, importMode, setImportMode, importValues, setImportValues,
      importBatchId, appendBatchId, setImportBatchId, setAppendBatchId,
      importCreate, setImportCreate, csvFile, setCsvFile, importLoading,
      toggleRow, toggleAllDisplayed, handleDeleteSelected,
      handleRowClick, closeModal, openImportForBatch, loadMembers,
      handleAddBatch, handleImport, submitImport, submitImportCsv,
      handleAddStudentSubmit,
      saveBatchEdits,
      updateBatchStatus,
      setQuery, setFilterBatch, setFilterStatus, setFilterInterviewer, setSortField, setSortDir,
  } = useBatchManagement(token, { allowInterviewer: user?.role === 'DEPT_HEAD' })
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'DEPT_HEAD' && user.role !== 'OFFICER')) return <Navigate to="/" replace />

    // Auto-open the selected batch when routed to /head/batch-management/:id
    // and show members by default for quick adding
    useEffect(() => {
      if (routeBatchId && batches && batches.length) {
        const b = batches.find(x => x.id === routeBatchId)
        if (b) {
          handleRowClick(b)
          setShowMembers(true)
        }
      }
    }, [routeBatchId, batches])

    const content = (
      <>
        <div className={`flex-1 bg-[#f7f1f2] px-10 py-8 overflow-y-auto ${embedded ? '' : 'h-[100dvh]'}`}>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">MANAGE BATCH</h1>
                        <p className="text-md text-[#2f2b33] mt-3">List of Batches</p>
                    </div>

                    <div className="bg-gradient-to-b from-red-300 to-pink-100 rounded-2xl px-4 py-15 flex items-center gap-3 mt-[-50px]">
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="text-gray-800 font-medium">Santiago Garcia</span>
                        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                <BatchFilters
                  query={query}
                  setQuery={setQuery}
                  batchOptions={batchOptions}
                  statusOptions={statusOptions}
                  interviewerOptions={interviewerOptions}
                  filterBatch={filterBatch}
                  setFilterBatch={setFilterBatch}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterInterviewer={filterInterviewer}
                  setFilterInterviewer={setFilterInterviewer}
                  selectedIds={selectedIds}
                  handleDeleteSelected={handleDeleteSelected}
                  handleAddBatch={handleAddBatch}
                />

                <BatchesTable
                  batchesLoading={batchesLoading}
                  displayedBatches={displayedBatches}
                  allDisplayedSelected={allDisplayedSelected}
                  toggleAllDisplayed={toggleAllDisplayed}
                  selectedIds={selectedIds}
                  toggleRow={toggleRow}
                  handleRowClick={(b) => navigate(`/head/batches/${b.id}`)}
                  sortField={sortField}
                  sortDir={sortDir}
                  onHeaderSort={(field) => {
                    setSortField(prev => (prev===field ? (setSortDir(d=>d==='asc'?'desc':'asc'), prev) : (setSortDir('asc'), field)))
                  }}
                  getStatusBadge={getStatusBadge}
                  statusOptions={statusOptions}
                  onChangeStatus={(batch, label) => updateBatchStatus(batch, label)}
                />
        </div>
            <AddBatchModal isOpen={isAddBatchOpen} setIsOpen={setIsAddBatchOpen} addBatchValues={addBatchValues} setAddBatchValues={setAddBatchValues} addBatchLoading={addBatchLoading} submitAddBatch={submitAddBatch} submitAddBatchAndImport={submitAddBatchAndImport} allowInterviewer={user?.role === 'DEPT_HEAD'} />

            <ImportModal
              isOpen={isImportOpen}
              setIsOpen={setIsImportOpen}
              importMode={importMode}
              setImportMode={setImportMode}
              importValues={importValues}
              setImportValues={setImportValues}
              batches={batches}
              importBatchId={importBatchId}
              appendBatchId={appendBatchId}
              setImportBatchId={setImportBatchId}
              setAppendBatchId={setAppendBatchId}
              importCreate={importCreate}
              setImportCreate={setImportCreate}
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              importLoading={importLoading}
              submitImport={submitImport}
              submitImportCsv={submitImportCsv}
            />

            <BatchDetailsModal
              isOpen={isModalOpen}
              selectedBatch={selectedBatch}
              closeModal={() => { closeModal(); if (routeBatchId) navigate('/head/batch-management') }}
              showMembers={showMembers}
              setShowMembers={setShowMembers}
              members={members}
              membersLoading={membersLoading}
              openImportForBatch={openImportForBatch}
              showAdd={showAdd}
              setShowAdd={setShowAdd}
              addValues={addValues}
              setAddValues={setAddValues}
              handleAddStudentSubmit={handleAddStudentSubmit}
              loadMembers={loadMembers}
              saveBatchEdits={saveBatchEdits}
            />
      </>
    )

    if (embedded) return content

    return (
      <div className="flex">
        <Sidebar />
        {content}
      </div>
  )
}
