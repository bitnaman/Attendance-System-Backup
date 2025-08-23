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
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSummary, setExportSummary] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [exportPeriod, setExportPeriod] = useState('monthly');
  const [exportClass, setExportClass] = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);

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

  // Fetch available classes for export
  useEffect(() => {
    const fetchAvailableClasses = async () => {
      try {
        const response = await fetch('http://localhost:8000/attendance/classes/available', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableClasses(data.classes || []);
        }
      } catch (error) {
        console.error('Error fetching available classes:', error);
      }
    };

    fetchAvailableClasses();
  }, []);

  // Fetch export summary when filters change
  useEffect(() => {
    const fetchExportSummary = async () => {
      try {
        const params = new URLSearchParams();
        params.append('period', exportPeriod);
        if (exportClass) {
          params.append('class_id', exportClass);
        }
        
        const response = await fetch(`http://localhost:8000/attendance/export/summary?${params}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setExportSummary(data.export_summary);
        }
      } catch (error) {
        console.error('Error fetching export summary:', error);
      }
    };

    if (showExportPanel) {
      fetchExportSummary();
    }
  }, [exportPeriod, exportClass, showExportPanel]);

  // Export attendance data
  const handleExport = async (format) => {
    setExportLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.append('period', exportPeriod);
      if (exportClass) {
        params.append('class_id', exportClass);
      }
      
      let endpoint = '';
      let mediaType = '';
      let fileExtension = '';
      
      switch (format) {
        case 'excel_summary':
          endpoint = 'excel';
          params.append('format_type', 'summary');
          mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = '.xlsx';
          break;
        case 'excel_detailed':
          endpoint = 'excel';
          params.append('format_type', 'detailed');
          mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = '.xlsx';
          break;
        case 'csv':
          endpoint = 'csv';
          mediaType = 'text/csv';
          fileExtension = '.csv';
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      const response = await fetch(`http://localhost:8000/attendance/export/${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': mediaType,
        },
      });
      
      if (response.ok) {
        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `attendance_${exportPeriod}_${new Date().toISOString().slice(0, 10)}${fileExtension}`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert(`✅ File downloaded successfully!\nFilename: ${filename}`);
        setShowExportPanel(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

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
    let aVal, bVal;
    
    switch (sortBy) {
      case 'date':
        aVal = new Date(a.date || a.created_at);
        bVal = new Date(b.date || b.created_at);
        break;
      case 'name':
        aVal = a.session_name.toLowerCase();
        bVal = b.session_name.toLowerCase();
        break;
      case 'attendance':
        aVal = a.total_present;
        bVal = b.total_present;
        break;
      default:
        aVal = new Date(a.date || a.created_at);
        bVal = new Date(b.date || b.created_at);
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const calculateAttendanceRate = (present, total) => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
  };

  return (
    <div className="view-attendance-container">
      <div className="attendance-header">
        <h2>📊 Attendance Analytics</h2>
        <p className="header-subtitle">View and analyze attendance sessions with advanced filtering</p>
      </div>

      {/* Enhanced Stats Overview */}
      {stats && (
        <div className="stats-overview">
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">🎓</div>
              <div className="stat-content">
                <div className="stat-number">{stats.total_students}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.present ?? stats.present_records}</div>
                <div className="stat-label">Present Records</div>
              </div>
            </div>
            <div className="stat-card error">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-number">{stats.absent ?? stats.absent_records}</div>
                <div className="stat-label">Absent Records</div>
              </div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-number">{stats.attendance_rate ? `${stats.attendance_rate.toFixed(1)}%` : 'N/A'}</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="filters-panel">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="class-filter">
              <span className="filter-icon">🏫</span>
              Class Filter
            </label>
            <select 
              id="class-filter"
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
            <label htmlFor="search-filter">
              <span className="filter-icon">🔍</span>
              Search Sessions
            </label>
            <input
              type="text"
              id="search-filter"
              placeholder="Search by session name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">
              <span className="filter-icon">📅</span>
              Date Filter
            </label>
            <input
              type="date"
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="sort-by">
              <span className="filter-icon">📋</span>
              Sort By
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date">Date</option>
              <option value="name">Session Name</option>
              <option value="attendance">Attendance Count</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-order">
              <span className="filter-icon">🔄</span>
              Order
            </label>
            <select
              id="sort-order"
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
            <div className="view-mode-toggle">
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

          <div className="filter-group">
            <label>
              <span className="filter-icon">📊</span>
              Export Data
            </label>
            <button
              className="export-toggle-btn"
              onClick={() => setShowExportPanel(!showExportPanel)}
            >
              {showExportPanel ? '❌ Close Export' : '📥 Export Options'}
            </button>
          </div>
        </div>

        {/* Advanced Export Panel */}
        {showExportPanel && (
          <div className="export-panel">
            <div className="export-panel-header">
              <h3>📊 Advanced Export Options</h3>
              <p>Export your attendance data in various formats with smart filtering</p>
            </div>

            <div className="export-controls">
              <div className="export-control-group">
                <label>
                  <span className="control-icon">📅</span>
                  Time Period
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="export-select"
                >
                  <option value="weekly">📅 Last 7 Days</option>
                  <option value="monthly">📊 Last 30 Days</option>
                  <option value="all">💾 All Time Data</option>
                </select>
              </div>

              <div className="export-control-group">
                <label>
                  <span className="control-icon">🏫</span>
                  Class Filter
                </label>
                <select
                  value={exportClass}
                  onChange={(e) => setExportClass(e.target.value)}
                  className="export-select"
                >
                  <option value="">🌐 All Classes</option>
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.display_name} ({cls.session_count} sessions, {cls.student_count} students)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Export Preview */}
            {exportSummary && (
              <div className="export-preview">
                <h4>📈 Export Preview</h4>
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-icon">⏰</span>
                    <div>
                      <strong>{exportSummary.period_display}</strong>
                      <small>{exportSummary.start_date} to {exportSummary.end_date}</small>
                    </div>
                  </div>
                  
                  {exportSummary.class_info && (
                    <div className="preview-stat">
                      <span className="stat-icon">🏫</span>
                      <div>
                        <strong>{exportSummary.class_info.display_name}</strong>
                        <small>Selected Class</small>
                      </div>
                    </div>
                  )}
                  
                  <div className="preview-stat">
                    <span className="stat-icon">📋</span>
                    <div>
                      <strong>{exportSummary.statistics.total_sessions} Sessions</strong>
                      <small>{exportSummary.statistics.total_students} Students</small>
                    </div>
                  </div>
                  
                  <div className="preview-stat">
                    <span className="stat-icon">📊</span>
                    <div>
                      <strong>{exportSummary.statistics.overall_attendance_rate}% Attendance</strong>
                      <small>{exportSummary.statistics.present_records} Present, {exportSummary.statistics.absent_records} Absent</small>
                    </div>
                  </div>
                  
                  <div className="preview-stat">
                    <span className="stat-icon">🎯</span>
                    <div>
                      <strong>{exportSummary.insights.data_quality} Data</strong>
                      <small>Quality Assessment</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Format Options */}
            {exportSummary && (
              <div className="export-formats">
                <h4>� Choose Export Format</h4>
                <div className="format-options">
                  {exportSummary.export_options.map((option, index) => (
                    <div 
                      key={option.format} 
                      className={`format-option ${option.recommended ? 'recommended' : ''}`}
                    >
                      <div className="format-header">
                        <h5>{option.name}</h5>
                        {option.recommended && <span className="recommended-badge">⭐ Recommended</span>}
                      </div>
                      <p>{option.description}</p>
                      <button
                        className={`format-btn ${option.recommended ? 'primary' : 'secondary'}`}
                        onClick={() => handleExport(option.format)}
                        disabled={exportLoading}
                      >
                        {exportLoading ? '⏳ Exporting...' : `📥 Download ${option.name.split(' ')[1]}`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!exportSummary && (
              <div className="export-loading">
                <div className="loading-spinner"></div>
                <p>Loading export preview...</p>
              </div>
            )}
          </div>
        )}
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
                          <div className="session-card-header">
                            <div className="session-title">
                              <h4>{session.session_name}</h4>
                              <div className="session-meta">
                                <span className="session-date">📅 {dateTime.date}</span>
                                <span className="session-time">⏰ {dateTime.time}</span>
                              </div>
                            </div>
                            <div className={`attendance-badge ${attendanceRate >= 80 ? 'high' : attendanceRate >= 60 ? 'medium' : 'low'}`}>
                              {attendanceRate}%
                            </div>
                          </div>

                          {session.class_name && (
                            <div className="session-class">
                              🏫 {session.class_name} - Section {session.class_section}
                            </div>
                          )}

                          <div className="session-stats-grid">
                            <div className="stat-item">
                              <span className="stat-icon">👥</span>
                              <div className="stat-info">
                                <span className="stat-value">{session.total_detected}</span>
                                <span className="stat-label">Detected</span>
                              </div>
                            </div>
                            <div className="stat-item">
                              <span className="stat-icon">✅</span>
                              <div className="stat-info">
                                <span className="stat-value">{session.total_present}</span>
                                <span className="stat-label">Present</span>
                              </div>
                            </div>
                            <div className="stat-item">
                              <span className="stat-icon">❌</span>
                              <div className="stat-info">
                                <span className="stat-value">{session.total_detected - session.total_present}</span>
                                <span className="stat-label">Absent</span>
                              </div>
                            </div>
                          </div>

                          <div className="session-actions">
                            <button className="view-details-btn">View Details</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sessions-list">
                    <div className="list-header">
                      <div className="col-session">Session</div>
                      <div className="col-class">Class</div>
                      <div className="col-date">Date</div>
                      <div className="col-stats">Stats</div>
                      <div className="col-rate">Rate</div>
                      <div className="col-actions">Actions</div>
                    </div>
                    {sortedSessions.map(session => {
                      const dateTime = formatDate(session.date || session.created_at);
                      const attendanceRate = calculateAttendanceRate(session.total_present, session.total_detected);
                      
                      return (
                        <div
                          key={session.id}
                          className={`list-row ${selectedSession === session.id ? 'selected' : ''}`}
                          onClick={() => onSelectSession(session.id)}
                        >
                          <div className="col-session">
                            <h5>{session.session_name}</h5>
                            <span className="session-time">{dateTime.time}</span>
                          </div>
                          <div className="col-class">
                            {session.class_name ? `${session.class_name} - ${session.class_section}` : 'N/A'}
                          </div>
                          <div className="col-date">{dateTime.date}</div>
                          <div className="col-stats">
                            <span className="stat-present">✅ {session.total_present}</span>
                            <span className="stat-absent">❌ {session.total_detected - session.total_present}</span>
                            <span className="stat-total">👥 {session.total_detected}</span>
                          </div>
                          <div className="col-rate">
                            <div className={`rate-badge ${attendanceRate >= 80 ? 'high' : attendanceRate >= 60 ? 'medium' : 'low'}`}>
                              {attendanceRate}%
                            </div>
                          </div>
                          <div className="col-actions">
                            <button className="action-btn view-btn">👁️</button>
                            <button className="action-btn export-btn">📊</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Records Section */}
          {records.length > 0 && (
            <div className="records-section">
              <div className="section-header">
                <h3>📝 Attendance Records</h3>
                <div className="records-summary">
                  {records.filter(r => r.status || r.is_present).length} Present • {records.filter(r => !(r.status || r.is_present)).length} Absent
                </div>
              </div>

              <div className="records-container">
                <div className="records-grid">
                  {records.map(record => (
                    <div key={record.id} className="record-card">
                      <div className="record-header">
                        <div className="student-info">
                          <h5 className="student-name">{record.student_name}</h5>
                          <div className="student-details">
                            <span className="roll-no">🆔 {record.roll_no || record.student_roll_no}</span>
                            <span className="prn">📋 {record.prn}</span>
                            <span className="seat">💺 {record.seat_no}</span>
                          </div>
                        </div>
                        <div className={`status-indicator ${record.status || record.is_present ? 'present' : 'absent'}`}>
                          <span className="status-icon">
                            {record.status || record.is_present ? '✅' : '❌'}
                          </span>
                          <span className="status-text">
                            {record.status || record.is_present ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </div>

                      {record.class_name && (
                        <div className="record-class">
                          🏫 {record.class_name} - Section {record.class_section}
                        </div>
                      )}

                      {record.confidence && (
                        <div className="confidence-info">
                          <span className="confidence-label">Confidence:</span>
                          <div className="confidence-bar">
                            <div 
                              className="confidence-fill" 
                              style={{ width: `${record.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="confidence-value">{(record.confidence * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Session Info */}
          {stats && stats.recent_session && (
            <div className="recent-session-card">
              <div className="recent-header">
                <h4>🕒 Most Recent Session</h4>
                <div className="recent-date">
                  {new Date(stats.recent_session.date).toLocaleDateString()}
                </div>
              </div>
              <div className="recent-content">
                <div className="recent-info">
                  <h5>{stats.recent_session.name}</h5>
                  <div className="recent-stats">
                    <span className="recent-stat">
                      <span className="stat-icon">👥</span>
                      {stats.recent_session.detected} Detected
                    </span>
                    <span className="recent-stat">
                      <span className="stat-icon">✅</span>
                      {stats.recent_session.present} Present
                    </span>
                    <span className="recent-stat">
                      <span className="stat-icon">📈</span>
                      {calculateAttendanceRate(stats.recent_session.present, stats.recent_session.detected)}% Rate
                    </span>
                  </div>
                </div>
                <button 
                  className="view-recent-btn"
                  onClick={() => onSelectSession(stats.recent_session.id)}
                >
                  View Details
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
