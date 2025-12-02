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
import UserChip from '../../components/UserChip'

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
      handleAddBatch, submitImport, submitImportCsv,
      handleAddStudentSubmit,
      saveBatchEdits,
      updateBatchStatus,
      setQuery, setFilterBatch, setFilterStatus, setFilterInterviewer, setSortField, setSortDir,
  } = useBatchManagement(token, { allowInterviewer: user?.role === 'DEPT_HEAD' })
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'DEPT_HEAD' && user.role !== 'OFFICER')) return <Navigate to="/" replace />

    // When routed to /head/batch-management/:id, show page without opening edit modal

    const content = (
      <>
        <main className={`flex-1 h-[100dvh] bg-[#fff6f7] overflow-hidden ${embedded ? '' : ''}`}>
          <div className="h-full flex flex-col px-10 pt-10 pb-8 space-y-6">
            <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
            <div className="flex justify-between items-start">
              <div>
                <div className="uppercase tracking-[0.25em] text-sm text-[#5b1a30]">Records</div>
                <h1 className="text-5xl font-bold text-red-900 mb-2 mt-1">Batch Management</h1>
                <p className="text-base text-[#5b1a30]">List of Batches</p>
              </div>
              <UserChip />
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
            <div className="rounded-[32px] bg-white shadow-[0_35px_90px_rgba(239,150,150,0.35)] p-0 overflow-hidden border border-[#f7d6d6]">
              <div className="overflow-x-auto no-scrollbar">
                <BatchesTable
                  batchesLoading={batchesLoading}
                  displayedBatches={displayedBatches}
                  allDisplayedSelected={allDisplayedSelected}
                  toggleAllDisplayed={toggleAllDisplayed}
                  selectedIds={selectedIds}
                  toggleRow={toggleRow}
                  handleRowClick={(b) => navigate(`/head/batches/${b.id}`)}
                  openEditModal={(b) => handleRowClick(b)}
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
            </div>
          </div>
        </main>
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
      <div className="min-h-screen flex">
        <Sidebar />
        {content}
      </div>
  )
}
