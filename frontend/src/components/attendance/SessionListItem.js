import React from 'react';

/**
 * SessionListItem - List view row for an attendance session
 * Displays session info in a compact table row format
 */
export default function SessionListItem({
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
      className={`list-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(session.id)}
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
        <span className="stat-number absent">{absentCount}</span>
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
}
