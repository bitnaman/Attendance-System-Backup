import React from 'react';

/**
 * SessionCard - Grid view card for an attendance session
 * Displays session info with stats in a card format
 */
export default function SessionCard({
  session,
  isSelected,
  onSelect,
  formatDate,
  calculateAttendanceRate
}) {
  const dateTime = formatDate(session.date || session.created_at);
  const attendanceRate = calculateAttendanceRate(
    session.total_present, 
    session.total_students || session.total_detected
  );
  
  const absentCount = (session.total_absent ?? (session.total_students - session.total_present)) || 0;

  return (
    <div
      className={`session-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(session.id)}
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
            <div className="stat-number absent">{absentCount}</div>
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
}
