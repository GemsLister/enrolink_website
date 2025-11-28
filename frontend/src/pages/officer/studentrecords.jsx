import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import OfficerSidebar from '../../components/OfficerSidebar'
import { useAuth } from '../../hooks/useAuth'
import { RecordsOverviewContent, RecordsPanel } from '../head/studentrecords'

// Error boundary for catching rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in Officer component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Something went wrong. Please try again later.</div>;
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node
};

export function OfficerRecordsOverview() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user || user.role !== 'OFFICER') return <Navigate to="/" replace />;
  
  return (
    <ErrorBoundary>
      <div className="flex">
        <OfficerSidebar />
        <RecordsOverviewContent basePath="/officer/records" />
      </div>
    </ErrorBoundary>
  );
}

OfficerRecordsOverview.propTypes = {};

export default function OfficerStudentRecords({ view = 'applicants' }) {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user || user.role !== 'OFFICER') return <Navigate to="/" replace />;
  
  return (
    <ErrorBoundary>
      <div className="flex">
        <OfficerSidebar />
        <RecordsPanel token={token} view={view} basePath="/officer/records" />
      </div>
    </ErrorBoundary>
  );
}

OfficerStudentRecords.propTypes = {
  view: PropTypes.string
};
