import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import HeadLogin from './pages/head/HeadLogin'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import HeadDashboard from './pages/head/Dashboard'
import HeadCalendar from './pages/head/Calendar'
import StudentRecords from './pages/head/studentrecords'
import BatchManagement from './pages/head/batchmanagement'
import EnrollmentOfficers from './pages/head/enrollmentofficers'
import Reports from './pages/head/reports'
import HeadSettings from './pages/head/settings'
import ArchivePage from './pages/head/archive'
import OfficerDashboard from './pages/officer/Dashboard'
import OfficerStudentRecords from './pages/officer/studentrecords'
import OfficerReports from './pages/officer/reports'
import OfficerLogin from './pages/officer/Login'
import OfficerBatchManagement from './pages/officer/batchmanagement'
import OfficerSettings from './pages/officer/settings'
import OfficerCalendar from './pages/officer/Calendar'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/head/login" element={<HeadLogin />} />
      <Route path="/officer/login" element={<OfficerLogin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Head routes */}
      <Route path="/dashboard" element={<Navigate to="/head/dashboard" replace />} />
      <Route path="/head/dashboard" element={<HeadDashboard />} />
      <Route path="/head/calendar" element={<HeadCalendar />} />
      <Route path="/head/student-records" element={<StudentRecords />} />
      <Route path="/head/batch-management" element={<BatchManagement />} />
      <Route path="/head/enrollment-officers" element={<EnrollmentOfficers />} />
      <Route path="/head/reports" element={<Reports />} />
      <Route path="/head/settings" element={<HeadSettings />} />
      <Route path="/head/archive" element={<ArchivePage />} />
      {/* Officer routes */}
      <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />
      <Route path="/officer/dashboard" element={<OfficerDashboard />} />
      <Route path="/officer/calendar" element={<OfficerCalendar />} />
      <Route path="/officer/student-records" element={<OfficerStudentRecords />} />
      <Route path="/officer/reports" element={<OfficerReports />} />
      <Route path="/officer/batch-management" element={<OfficerBatchManagement />} />
      <Route path="/officer/settings" element={<OfficerSettings />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
