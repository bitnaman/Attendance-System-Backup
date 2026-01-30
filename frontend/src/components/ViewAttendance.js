import React, { useState, useEffect } from 'react';
import {
  SessionFilters,
  SessionCard,
  SessionListItem,
  SessionDetails,
  calculateAttendanceRate,
  formatDate
} from './attendance';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * ViewAttendance - Main component for viewing attendance sessions
 * Uses modular sub-components for better maintainability
 */
export default function ViewAttendance({
  loading,
  sessions,
  stats,
  selectedSession,
  onSelectSession,
  records
}) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');

  // Fetch classes for filtering
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/classes`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setClasses(data);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, []);

  // Filter sessions by selected class
  const filteredSessions = selectedClass 
    ? sessions.filter(session => session.class_id === parseInt(selectedClass))
    : sessions;

  // Apply search and date filters
  const searchFilteredSessions = filteredSessions.filter(session => {
    const matchesSearch = session.session_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.class_name && session.class_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || 
                       new Date(session.date || session.created_at).toDateString() === new Date(dateFilter).toDateString();
    
    return matchesSearch && matchesDate;
  });

  // Sort sessions
  const sortedSessions = [...searchFilteredSessions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date || a.created_at);
        bValue = new Date(b.date || b.created_at);
        break;
      case 'name':
        aValue = a.session_name.toLowerCase();
        bValue = b.session_name.toLowerCase();
        break;
      case 'attendance':
        aValue = calculateAttendanceRate(a.total_present, a.total_students || a.total_detected);
        bValue = calculateAttendanceRate(b.total_present, b.total_students || b.total_detected);
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Get selected session object
  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  // Clear all filters
  const clearFilters = () => {
    setSelectedClass('');
    setSearchTerm('');
    setDateFilter('');
  };

  return (
    <div className="view-attendance">
      {/* Filters Section */}
      <SessionFilters
        classes={classes}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading attendance data...</div>
        </div>
      )}

      {!loading && (
        <div className="attendance-content">
          {/* Sessions Section */}
          <div className="sessions-section">
            <div className="section-header">
              <h3>📋 Attendance Sessions ({sortedSessions.length})</h3>
              {sortedSessions.length > 0 && (
                <div className="session-summary">
                  Showing {sortedSessions.length} of {sessions.length} sessions
                </div>
              )}
            </div>

            {sortedSessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>No Sessions Found</h4>
                <p>No attendance sessions match your current filters.</p>
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={`sessions-container ${viewMode}`}>
                {viewMode === 'grid' ? (
                  <div className="sessions-grid">
                    {sortedSessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isSelected={selectedSession === session.id}
                        onSelect={onSelectSession}
                        formatDate={formatDate}
                        calculateAttendanceRate={calculateAttendanceRate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="sessions-list">
                    <div className="list-header">
                      <div className="col-name">Session Name</div>
                      <div className="col-date">Date & Time</div>
                      <div className="col-class">Class</div>
                      <div className="col-present">Present</div>
                      <div className="col-absent">Absent</div>
                      <div className="col-rate">Rate</div>
                      <div className="col-actions">Actions</div>
                    </div>
                    {sortedSessions.map(session => (
                      <SessionListItem
                        key={session.id}
                        session={session}
                        isSelected={selectedSession === session.id}
                        onSelect={onSelectSession}
                        formatDate={formatDate}
                        calculateAttendanceRate={calculateAttendanceRate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session Details Section */}
          {selectedSession && selectedSessionData && (
            <SessionDetails
              session={selectedSessionData}
              records={records}
              onClose={() => onSelectSession(null)}
              formatDate={formatDate}
              calculateAttendanceRate={calculateAttendanceRate}
            />
          )}
        </div>
      )}
    </div>
  );
}
