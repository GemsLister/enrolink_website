import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import HeadLogin from './pages/head/HeadLogin'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import HeadDashboard from './pages/head/Dashboard'
import HeadCalendar from './pages/head/Calendar'
import StudentRecords, { HeadRecordsOverview } from './pages/head/studentrecords'
import BatchManagement from './pages/head/batchmanagement'
import EnrollmentOfficers from './pages/head/enrollmentofficers'
import Reports from './pages/head/reports'
import HeadSettings from './pages/head/settings'
import OfficerDashboard from './pages/officer/Dashboard'
import OfficerStudentRecords, { OfficerRecordsOverview } from './pages/officer/studentrecords'
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
      <Route path="/head/records" element={<HeadRecordsOverview />} />
      <Route path="/head/records/applicants" element={<StudentRecords view="applicants" />} />
      <Route path="/head/records/enrollees" element={<StudentRecords view="enrollees" />} />
      <Route path="/head/records/students" element={<StudentRecords view="students" />} />
      <Route path="/head/records/archive" element={<StudentRecords view="archive" />} />
      <Route path="/head/student-records" element={<Navigate to="/head/records/applicants" replace />} />
      <Route path="/head/batch-management" element={<BatchManagement />} />
      <Route path="/head/enrollment-officers" element={<EnrollmentOfficers />} />
      <Route path="/head/reports" element={<Reports />} />
      <Route path="/head/settings" element={<HeadSettings />} />
      {/* Officer routes */}
      <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />
      <Route path="/officer/dashboard" element={<OfficerDashboard />} />
      <Route path="/officer/calendar" element={<OfficerCalendar />} />
      <Route path="/officer/records" element={<OfficerRecordsOverview />} />
      <Route path="/officer/records/applicants" element={<OfficerStudentRecords view="applicants" />} />
      <Route path="/officer/records/enrollees" element={<OfficerStudentRecords view="enrollees" />} />
      <Route path="/officer/records/students" element={<OfficerStudentRecords view="students" />} />
      <Route path="/officer/records/archive" element={<OfficerStudentRecords view="archive" />} />
      <Route path="/officer/student-records" element={<Navigate to="/officer/records/applicants" replace />} />
      <Route path="/officer/reports" element={<OfficerReports />} />
      <Route path="/officer/batch-management" element={<OfficerBatchManagement />} />
      <Route path="/officer/settings" element={<OfficerSettings />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
