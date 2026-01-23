import React from 'react';
import StudentRecordsTable from './StudentRecordsTable';

/**
 * SessionDetails - Displays detailed information about a selected session
 * Includes session info, attendance summary, and student records
 */
export default function SessionDetails({
  session,
  records,
  onClose,
  formatDate,
  calculateAttendanceRate
}) {
  if (!session) return null;

  const sessionRecords = records.filter(record => record.session_id === session.id);
  const dateTime = formatDate(session.date || session.created_at);
  const attendanceRate = calculateAttendanceRate(
    session.total_present, 
    session.total_students || session.total_detected
  );
  
  const absentCount = (session.total_absent ?? (session.total_students - session.total_present)) || 0;
  const totalStudents = session.total_students || session.total_detected || 0;

  return (
    <div className="session-details-section">
      <div className="section-header">
        <h3>📊 Session Details</h3>
        <button 
          className="close-details-btn"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>
      
      <div className="session-details">
        <div className="session-info">
          {/* Session Information Card */}
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
          
          {/* Attendance Summary Card */}
          <div className="info-card">
            <h4>📊 Attendance Summary</h4>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-number present">{session.total_present || 0}</span>
                <span className="stat-label">Present</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number absent">{absentCount}</span>
                <span className="stat-label">Absent</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number total">{totalStudents}</span>
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
        
        {/* Student Records Table */}
        <StudentRecordsTable records={sessionRecords} formatDate={formatDate} />
      </div>
    </div>
  );
}

