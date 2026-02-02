/**
 * Attendance Module Components
 * Redesigned View Attendance with modern UI
 */

// Components
export { default as SessionCardNew } from './SessionCardNew';
export { default as SessionDetailsModal } from './SessionDetailsModal';
export { default as FiltersPanel } from './FiltersPanel';
export { default as EmptyState } from './EmptyState';

// Utility functions used across attendance components
export const calculateAttendanceRate = (present, totalStudents) => {
  if (!totalStudents || totalStudents === 0) return 0;
  return Math.round((present / totalStudents) * 100);
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  };
};
