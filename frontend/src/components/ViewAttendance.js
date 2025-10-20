import React, { useState, useEffect } from 'react';

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch classes for filtering
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('http://localhost:8000/student/classes', {
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
        aValue = calculateAttendanceRate(a.total_present, a.total_detected);
        bValue = calculateAttendanceRate(b.total_present, b.total_detected);
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

  // Helper function to calculate attendance rate
  const calculateAttendanceRate = (present, total) => {
    if (!total || total === 0) return 0;
    return Math.round((present / total) * 100);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="view-attendance">
      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-container">
          {/* First Row - Main Filters */}
          <div className="filters-row">
            <div className="filter-group">
              <label>
                <span className="filter-icon">🏫</span>
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="filter-select"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <span className="filter-icon">🔍</span>
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>
                <span className="filter-icon">📅</span>
                Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          {/* Second Row - Sort & View Controls */}
          <div className="filters-row">
            <div className="filter-group">
              <label>
                <span className="filter-icon">📊</span>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="date">Date</option>
                <option value="name">Session Name</option>
                <option value="attendance">Attendance Rate</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <span className="filter-icon">🔄</span>
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="filter-select"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <span className="filter-icon">👁️</span>
                View Mode
              </label>
              <div className="view-mode-buttons">
                <button
                  className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  ⊞ Grid
                </button>
                <button
                  className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  ☰ List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  onClick={() => {
                    setSelectedClass('');
                    setSearchTerm('');
                    setDateFilter('');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={`sessions-container ${viewMode}`}>
                {viewMode === 'grid' ? (
                  <div className="sessions-grid">
                    {sortedSessions.map(session => {
                      const dateTime = formatDate(session.date || session.created_at);
                      const attendanceRate = calculateAttendanceRate(session.total_present, session.total_detected);
                      
                      return (
                        <div
                          key={session.id}
                          className={`session-card ${selectedSession === session.id ? 'selected' : ''}`}
                          onClick={() => onSelectSession(session.id)}
                        >
                          <div className="session-header">
                            <div className="session-title">
                              <h4>{session.session_name}</h4>
                              <p className="session-subtitle">{session.class_name || 'Unknown Class'}</p>
                            </div>
                            <div className="session-date">
                              <div className="date">{dateTime.date}</div>
                              <div className="time">{dateTime.time}</div>
                            </div>
                          </div>
                          
                          <div className="session-body">
                            <div className="session-stats">
                              <div className="stat-item">
                                <div className="stat-number present">{session.total_present || 0}</div>
                                <div className="stat-label">Present</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-number absent">{session.total_detected - session.total_present || 0}</div>
                                <div className="stat-label">Absent</div>
                              </div>
                              <div className="stat-item">
                                <div className={`stat-number rate ${attendanceRate >= 80 ? 'good' : attendanceRate >= 60 ? 'warning' : 'poor'}`}>
                                  {attendanceRate}%
                                </div>
                                <div className="stat-label">Rate</div>
                              </div>
                            </div>
                            
                            <div className="session-actions">
                              <button className="action-btn view-btn" title="View Details">👁️</button>
                              <button className="action-btn export-btn" title="Export Data">📊</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                    {sortedSessions.map(session => {
                      const dateTime = formatDate(session.date || session.created_at);
                      const attendanceRate = calculateAttendanceRate(session.total_present, session.total_detected);
                      
                      return (
                        <div
                          key={session.id}
                          className={`list-item ${selectedSession === session.id ? 'selected' : ''}`}
                          onClick={() => onSelectSession(session.id)}
                        >
                          <div className="col-name">
                            <strong>{session.session_name}</strong>
                            <small>{session.class_name || 'Unknown Class'}</small>
                          </div>
                          <div className="col-date">
                            <div>{dateTime.date}</div>
                            <small>{dateTime.time}</small>
                          </div>
                          <div className="col-class">{session.class_name || 'Unknown'}</div>
                          <div className="col-present">
                            <span className="stat-number present">{session.total_present || 0}</span>
                          </div>
                          <div className="col-absent">
                            <span className="stat-number absent">{session.total_detected - session.total_present || 0}</span>
                          </div>
                          <div className={`col-rate ${attendanceRate >= 80 ? 'good' : attendanceRate >= 60 ? 'warning' : 'poor'}`}>
                            <span className="stat-number rate">{attendanceRate}%</span>
                          </div>
                          <div className="col-actions">
                            <button className="action-btn view-btn" title="View Details">👁️</button>
                            <button className="action-btn export-btn" title="Export Data">📊</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session Details Section */}
          {selectedSession && (
            <div className="session-details-section">
              <div className="section-header">
                <h3>📊 Session Details</h3>
                <button 
                  className="close-details-btn"
                  onClick={() => onSelectSession(null)}
                >
                  ✕ Close
                </button>
              </div>
              
              {(() => {
                const session = sessions.find(s => s.id === selectedSession);
                if (!session) return null;
                
                const sessionRecords = records.filter(record => record.session_id === selectedSession);
                const dateTime = formatDate(session.date || session.created_at);
                const attendanceRate = calculateAttendanceRate(session.total_present, session.total_detected);
                
                return (
                  <div className="session-details">
                    <div className="session-info">
                      <div className="info-card">
                        <h4>📋 Session Information</h4>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Session Name:</span>
                            <span className="info-value">{session.session_name}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Date:</span>
                            <span className="info-value">{dateTime.date}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Time:</span>
                            <span className="info-value">{dateTime.time}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Class:</span>
                            <span className="info-value">{session.class_name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="info-card">
                        <h4>📊 Attendance Summary</h4>
                        <div className="summary-stats">
                          <div className="summary-stat">
                            <span className="stat-number present">{session.total_present || 0}</span>
                            <span className="stat-label">Present</span>
                          </div>
                          <div className="summary-stat">
                            <span className="stat-number absent">{session.total_detected - session.total_present || 0}</span>
                            <span className="stat-label">Absent</span>
                          </div>
                          <div className="summary-stat">
                            <span className="stat-number total">{session.total_detected || 0}</span>
                            <span className="stat-label">Total</span>
                          </div>
                          <div className="summary-stat">
                            <span className={`stat-number rate ${attendanceRate >= 80 ? 'good' : attendanceRate >= 60 ? 'warning' : 'poor'}`}>
                              {attendanceRate}%
                            </span>
                            <span className="stat-label">Rate</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {sessionRecords.length > 0 && (
                      <div className="records-section">
                        <h4>👥 Student Records ({sessionRecords.length})</h4>
                        <div className="records-table">
                          <div className="table-header">
                            <div className="col-student">Student Name</div>
                            <div className="col-roll">Roll Number</div>
                            <div className="col-status">Status</div>
                            <div className="col-time">Time</div>
                          </div>
                          {sessionRecords.map(record => (
                            <div key={record.id} className="table-row">
                              <div className="col-student">
                                <strong>{record.student_name}</strong>
                              </div>
                              <div className="col-roll">{record.roll_no}</div>
                              <div className={`col-status ${record.status}`}>
                                {record.status === 'present' ? '✅ Present' : '❌ Absent'}
                              </div>
                              <div className="col-time">
                                {record.timestamp ? formatDate(record.timestamp).time : 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}