export const toUiStatus = (s) => {
  switch ((s || '').toUpperCase()) {
    case 'PASSED':
      return 'Passed'
    case 'FAILED':
      return 'Failed'
    case 'PENDING':
      return 'Pending'
    default:
      return (s || '').charAt(0) + (s || '').slice(1).toLowerCase()
  }
}

export const toApiStatus = (s) => {
  const v = (s || '').toString().toUpperCase()
  if (['PASSED', 'FAILED', 'PENDING', 'ENROLLED', 'AWOL', 'INTERVIEWED'].includes(v)) return v
  if (v === 'PASS') return 'PASSED'
  return 'PENDING'
}

export const getStatusBadge = (status) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
  switch (status) {
    case 'Passed':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'Failed':
      return `${baseClasses} bg-red-100 text-red-800`
    case 'Pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}
