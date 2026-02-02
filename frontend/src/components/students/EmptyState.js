import React from 'react';

/**
 * EmptyState - Empty state component for when no students found
 */
export default function EmptyState({
  hasFilters,
  onClearFilters,
  totalStudents
}) {
  if (hasFilters) {
    return (
      <div className="ms-empty">
        <span className="ms-empty-icon">🔍</span>
        <h3 className="ms-empty-title">No Students Found</h3>
        <p className="ms-empty-text">
          No students match your current filters. 
          Try adjusting your search criteria or clearing the filters.
        </p>
        <button className="ms-empty-action" onClick={onClearFilters}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          Clear All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="ms-empty">
      <span className="ms-empty-icon">👥</span>
      <h3 className="ms-empty-title">No Students Registered</h3>
      <p className="ms-empty-text">
        Your student database is empty. Register your first student to get started 
        with the facial attendance system.
      </p>
    </div>
  );
}
