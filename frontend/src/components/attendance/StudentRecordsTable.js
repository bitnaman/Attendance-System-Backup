import React from 'react';

/**
 * StudentRecordsTable - Displays student attendance records in a table
 * Shows student name, roll number, status, and timestamp
 */
export default function StudentRecordsTable({ records, formatDate }) {
  if (!records || records.length === 0) {
    return (
      <div className="no-records">
        <div className="empty-icon">📭</div>
        <p>No student records found for this session.</p>
      </div>
    );
  }

  return (
    <div className="records-section">
      <h4>👥 Student Records ({records.length})</h4>
      <div className="records-table">
        <div className="table-header">
          <div className="col-student">Student Name</div>
          <div className="col-roll">Roll Number</div>
          <div className="col-status">Status</div>
          <div className="col-time">Time</div>
        </div>
        {records.map(record => (
          <div key={record.id} className={`table-row ${record.status}`}>
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
  );
}
