import React from 'react';

/**
 * EmptyState - Displays when no sessions are found
 * Shows different messages based on whether filters are active
 */
export default function EmptyState({ hasFilters, onClearFilters, totalSessions }) {
  if (hasFilters) {
    return (
      <div className="va-empty">
        <div className="va-empty-illustration">
          <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="135" rx="80" ry="10" fill="#E5E7EB"/>
            <path d="M60 45C60 35.6112 67.6112 28 77 28H123C132.389 28 140 35.6112 140 45V105C140 114.389 132.389 122 123 122H77C67.6112 122 60 114.389 60 105V45Z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
            <rect x="72" y="42" width="56" height="6" rx="3" fill="#D1D5DB"/>
            <rect x="72" y="54" width="40" height="6" rx="3" fill="#E5E7EB"/>
            <rect x="72" y="70" width="56" height="6" rx="3" fill="#D1D5DB"/>
            <rect x="72" y="82" width="48" height="6" rx="3" fill="#E5E7EB"/>
            <rect x="72" y="98" width="36" height="6" rx="3" fill="#D1D5DB"/>
            <circle cx="145" cy="40" r="25" fill="#FEE2E2" stroke="#FCA5A5" strokeWidth="2"/>
            <path d="M135 30L155 50M155 30L135 50" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="va-empty-title">No matching sessions</h3>
        <p className="va-empty-text">
          No attendance sessions match your current filters.
          Try adjusting your search criteria or clear all filters.
        </p>
        <div className="va-empty-actions">
          <button className="va-btn va-btn--primary" onClick={onClearFilters}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Clear All Filters
          </button>
        </div>
        <p className="va-empty-hint">
          {totalSessions > 0 
            ? `${totalSessions} total sessions available`
            : 'Start by marking attendance to create sessions'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="va-empty">
      <div className="va-empty-illustration">
        <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="135" rx="80" ry="10" fill="#E5E7EB"/>
          <path d="M40 55C40 45.6112 47.6112 38 57 38H143C152.389 38 160 45.6112 160 55V115C160 124.389 152.389 132 143 132H57C47.6112 132 40 124.389 40 115V55Z" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
          <rect x="55" y="52" width="90" height="8" rx="4" fill="#E5E7EB"/>
          <rect x="55" y="68" width="60" height="8" rx="4" fill="#F3F4F6"/>
          <rect x="55" y="84" width="75" height="8" rx="4" fill="#E5E7EB"/>
          <rect x="55" y="100" width="50" height="8" rx="4" fill="#F3F4F6"/>
          <circle cx="155" cy="50" r="30" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="2"/>
          <path d="M145 50L152 57L165 44" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="va-empty-title">No attendance sessions yet</h3>
      <p className="va-empty-text">
        Start by marking attendance to create your first session.
        Sessions will appear here once recorded.
      </p>
      <div className="va-empty-actions">
        <button className="va-btn va-btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Mark Attendance
        </button>
      </div>
    </div>
  );
}
