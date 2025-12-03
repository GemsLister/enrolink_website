import { Navigate } from 'react-router-dom'
import OfficerSidebar from '../../components/OfficerSidebar'
import HeadBatchManagement from '../head/batchmanagement'
import { useAuth } from '../../hooks/useAuth'

export default function OfficerBatchManagement() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role !== 'OFFICER') return <Navigate to="/" replace />

  return (
    <div className="flex">
      <OfficerSidebar />
      <div className="flex-1">
        <HeadBatchManagement embedded={true} />
      </div>
    </div>
  )
}
