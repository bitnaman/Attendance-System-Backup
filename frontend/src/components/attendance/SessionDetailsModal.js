import React, { useState, useMemo, useEffect, useRef } from 'react';

/**
 * SessionDetailsModal - Full-screen modal for session details
 * Includes session info, attendance summary, and searchable student list
 */
export default function SessionDetailsModal({
  session,
  records,
  onClose,
  formatDate,
  calculateRate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const modalRef = useRef(null);

  const dateTime = formatDate(session.date || session.created_at);
  const totalStudents = session.total_students || session.total_detected || 0;
  const presentCount = session.total_present || 0;
  
  // Calculate rate and cap at 100%
  const rawRate = calculateRate(presentCount, totalStudents);
  const rate = Math.min(100, rawRate);
  
  // Calculate absent count - ensure it's never negative
  const absentCount = session.total_absent != null 
    ? Math.max(0, session.total_absent)
    : Math.max(0, totalStudents - presentCount);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus trap
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  // Filter and sort records
  const processedRecords = useMemo(() => {
    let result = [...records];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.student_name?.toLowerCase().includes(term) ||
        r.roll_no?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.student_name || '').localeCompare(b.student_name || '');
        case 'roll':
          return (a.roll_no || '').localeCompare(b.roll_no || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'time':
          return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, statusFilter, sortBy]);

  // Get rate status
  const getRateStatus = (rate) => {
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'warning';
    return 'poor';
  };

  const rateStatus = getRateStatus(rate);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="va-modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="va-modal" 
        ref={modalRef}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <header className="va-modal-header">
          <div className="va-modal-header-content">
            <h2 id="modal-title" className="va-modal-title">
              {session.session_name}
            </h2>
            <div className="va-modal-subtitle">
              <span className="va-modal-class">{session.class_name || 'Unknown Class'}</span>
              <span className="va-modal-divider">•</span>
              <span className="va-modal-date">{dateTime.full}</span>
              <span className="va-modal-time">{dateTime.time}</span>
            </div>
          </div>
          <button 
            className="va-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Stats Summary */}
        <div className="va-modal-stats">
          <div className="va-modal-stat va-modal-stat--present">
            <div className="va-modal-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="va-modal-stat-content">
              <span className="va-modal-stat-value">{presentCount}</span>
              <span className="va-modal-stat-label">Present</span>
            </div>
          </div>
          
          <div className="va-modal-stat va-modal-stat--absent">
            <div className="va-modal-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <div className="va-modal-stat-content">
              <span className="va-modal-stat-value">{absentCount}</span>
              <span className="va-modal-stat-label">Absent</span>
            </div>
          </div>
          
          <div className="va-modal-stat va-modal-stat--total">
            <div className="va-modal-stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="va-modal-stat-content">
              <span className="va-modal-stat-value">{totalStudents}</span>
              <span className="va-modal-stat-label">Total</span>
            </div>
          </div>
          
          <div className={`va-modal-stat va-modal-stat--rate va-modal-stat--${rateStatus}`}>
            <div className="va-modal-stat-ring">
              <svg viewBox="0 0 36 36" className="va-progress-ring-modal">
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
              <span className="va-modal-rate-value">{rate}%</span>
            </div>
            <span className="va-modal-stat-label">Attendance Rate</span>
          </div>
        </div>

        {/* Student Records Section */}
        <div className="va-modal-content">
          <div className="va-modal-records-header">
            <h3 className="va-modal-records-title">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Student Records ({processedRecords.length})
            </h3>
            
            {/* Records Filters */}
            <div className="va-modal-records-filters">
              <div className="va-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="va-filter-chips">
                <button 
                  className={`va-chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`va-chip va-chip--present ${statusFilter === 'present' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('present')}
                >
                  Present
                </button>
                <button 
                  className={`va-chip va-chip--absent ${statusFilter === 'absent' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('absent')}
                >
                  Absent
                </button>
              </div>
            </div>
          </div>

          {/* Records List */}
          {processedRecords.length === 0 ? (
            <div className="va-modal-empty">
              <svg viewBox="0 0 24 24" fill="currentColor" className="va-modal-empty-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>
              </svg>
              <p>No student records found</p>
              {searchTerm && (
                <button 
                  className="va-btn-clear"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="va-records-list">
              {/* Table Header */}
              <div className="va-records-table-header">
                <button 
                  className={`va-table-col va-table-col--name ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => setSortBy('name')}
                >
                  Student Name
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                <button 
                  className={`va-table-col va-table-col--roll ${sortBy === 'roll' ? 'active' : ''}`}
                  onClick={() => setSortBy('roll')}
                >
                  Roll No.
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                <button 
                  className={`va-table-col va-table-col--status ${sortBy === 'status' ? 'active' : ''}`}
                  onClick={() => setSortBy('status')}
                >
                  Status
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                <button 
                  className={`va-table-col va-table-col--time ${sortBy === 'time' ? 'active' : ''}`}
                  onClick={() => setSortBy('time')}
                >
                  Time
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
              </div>
              
              {/* Table Body */}
              <div className="va-records-table-body">
                {processedRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className={`va-record-row va-record-row--${record.status}`}
                  >
                    <div className="va-record-col va-record-col--name">
                      <div className="va-record-avatar">
                        {record.student_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="va-record-name">{record.student_name || 'Unknown'}</span>
                    </div>
                    <div className="va-record-col va-record-col--roll">
                      {record.roll_no || '-'}
                    </div>
                    <div className="va-record-col va-record-col--status">
                      <span className={`va-status-badge va-status-badge--${record.status}`}>
                        {record.status === 'present' ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            Present
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            Absent
                          </>
                        )}
                      </span>
                    </div>
                    <div className="va-record-col va-record-col--time">
                      {record.timestamp ? formatDate(record.timestamp).time : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="va-modal-footer">
          <button className="va-btn va-btn--secondary" onClick={onClose}>
            Close
          </button>
          <button className="va-btn va-btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </footer>
      </div>
    </div>
  );
}
