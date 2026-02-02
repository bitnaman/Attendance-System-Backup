import React from 'react';

/**
 * SessionCardNew - Modern session card with glassmorphism design
 * Supports both grid and list view modes
 */
export default function SessionCardNew({
  session,
  viewMode,
  onSelect,
  formatDate,
  calculateRate
}) {
  const dateTime = formatDate(session.date || session.created_at);
  const totalStudents = session.total_students || session.total_detected || 0;
  const presentCount = session.total_present || 0;
  
  // Calculate rate and cap at 100% to handle data inconsistencies
  const rawRate = calculateRate(presentCount, totalStudents);
  const rate = Math.min(100, rawRate);
  
  // Calculate absent count - use provided value or compute from total - present
  // Ensure it's never negative
  const absentCount = session.total_absent != null 
    ? Math.max(0, session.total_absent)
    : Math.max(0, totalStudents - presentCount);

  // Get rate status for styling
  const getRateStatus = (rate) => {
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'warning';
    return 'poor';
  };

  const rateStatus = getRateStatus(rate);

  // Handle card click
  const handleClick = () => {
    onSelect(session.id);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(session.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="va-card va-card--list"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`View ${session.session_name} session details`}
      >
        <div className="va-card-list-main">
          <div className="va-card-list-info">
            <h3 className="va-card-title">{session.session_name}</h3>
            <div className="va-card-meta">
              <span className="va-card-class">{session.class_name || 'Unknown Class'}</span>
              <span className="va-card-divider">•</span>
              <span className="va-card-date">{dateTime.date}</span>
              <span className="va-card-time">{dateTime.time}</span>
            </div>
          </div>
          
          <div className="va-card-list-stats">
            <div className="va-stat-mini va-stat-mini--present">
              <span className="va-stat-mini-value">{session.total_present || 0}</span>
              <span className="va-stat-mini-label">Present</span>
            </div>
            <div className="va-stat-mini va-stat-mini--absent">
              <span className="va-stat-mini-value">{absentCount}</span>
              <span className="va-stat-mini-label">Absent</span>
            </div>
            <div className={`va-stat-mini va-stat-mini--rate va-stat-mini--${rateStatus}`}>
              <span className="va-stat-mini-value">{rate}%</span>
              <span className="va-stat-mini-label">Rate</span>
            </div>
          </div>
          
          <button className="va-card-action" aria-label="View details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div 
      className="va-card va-card--grid"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View ${session.session_name} session details`}
    >
      {/* Card Header with Gradient */}
      <div className={`va-card-header va-card-header--${rateStatus}`}>
        <div className="va-card-header-content">
          <h3 className="va-card-title">{session.session_name}</h3>
          <span className="va-card-class">{session.class_name || 'Unknown Class'}</span>
          <div className="va-card-datetime">
            <span className="va-card-date">{dateTime.date}</span>
            <span className="va-card-time">{dateTime.time}</span>
          </div>
        </div>
        
        {/* Decorative Circle */}
        <div className="va-card-rate-circle">
          <svg viewBox="0 0 36 36" className="va-progress-ring">
            <path
              className="va-progress-ring-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="va-progress-ring-fill"
              strokeDasharray={`${rate}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="va-card-rate-value">{rate}%</span>
        </div>
      </div>

      {/* Card Body with Stats */}
      <div className="va-card-body">
        <div className="va-card-stats">
          <div className="va-card-stat va-card-stat--present">
            <div className="va-card-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="va-card-stat-info">
              <span className="va-card-stat-value">{session.total_present || 0}</span>
              <span className="va-card-stat-label">Present</span>
            </div>
          </div>
          
          <div className="va-card-stat va-card-stat--absent">
            <div className="va-card-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <div className="va-card-stat-info">
              <span className="va-card-stat-value">{absentCount}</span>
              <span className="va-card-stat-label">Absent</span>
            </div>
          </div>
          
          <div className="va-card-stat va-card-stat--total">
            <div className="va-card-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="va-card-stat-info">
              <span className="va-card-stat-value">{totalStudents}</span>
              <span className="va-card-stat-label">Total</span>
            </div>
          </div>
        </div>
        
        {/* View Details Button */}
        <button className="va-card-view-btn">
          <span>View Details</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
