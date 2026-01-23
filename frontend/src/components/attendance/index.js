// Attendance Module Components
// Export all attendance-related components for easy imports

export { default as SessionFilters } from './SessionFilters';
export { default as SessionCard } from './SessionCard';
export { default as SessionListItem } from './SessionListItem';
export { default as SessionDetails } from './SessionDetails';
export { default as StudentRecordsTable } from './StudentRecordsTable';

// Utility functions used across attendance components
export const calculateAttendanceRate = (present, totalStudents) => {
  if (!totalStudents || totalStudents === 0) return 0;
  return Math.round((present / totalStudents) * 100);
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
};
