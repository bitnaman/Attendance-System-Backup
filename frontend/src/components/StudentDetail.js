import React, { useState, useEffect } from 'react';
import { fetchStudents, fetchExportClasses } from '../api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function StudentDetail({ studentId, onClose }) {
  const [student, setStudent] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (studentId) {
      loadStudentData();
      // Simply prevent body scroll - no position manipulation
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStudentInfo(),
        loadAttendanceStats(),
        loadAttendanceRecords(),
        loadLeaveRecords()
      ]);
    } catch (e) {
      console.error('Failed to load student data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/student/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      }
    } catch (e) {
      console.error('Failed to load student info:', e);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/attendance/student-stats/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttendanceStats(data);
      }
    } catch (e) {
      console.error('Failed to load attendance stats:', e);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const response = await fetch(`${API_BASE}/attendance/records?student_id=${studentId}&limit=100`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
      }
    } catch (e) {
      console.error('Failed to load attendance records:', e);
    }
  };

  const loadLeaveRecords = async () => {
    try {
      const response = await fetch(`${API_BASE}/medical/leave?student_id=${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveRecords(data);
      }
    } catch (e) {
      console.error('Failed to load leave records:', e);
    }
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/static/')) return `${API_BASE}${photoPath}`;
    return `${API_BASE}/static/${photoPath}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAttendanceRate = () => {
    if (!attendanceStats) return 0;
    // Use effective_attendance_rate which includes approved leave sessions
    if (attendanceStats.effective_attendance_rate !== undefined) {
      return Math.round(attendanceStats.effective_attendance_rate);
    }
    // Fallback to raw calculation
    const total = attendanceStats.total_records || 0;
    const present = attendanceStats.present_records || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getApprovedLeaveSessions = () => {
    if (!attendanceStats) return 0;
    return attendanceStats.approved_leave_sessions || 0;
  };

  const getAdjustedAbsent = () => {
    if (!attendanceStats) return 0;
    return attendanceStats.adjusted_absent !== undefined 
      ? attendanceStats.adjusted_absent 
      : (attendanceStats.absent_records || 0);
  };

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: 40, 
          borderRadius: 8, 
          textAlign: 'center' 
        }}>
          <div>Loading student details...</div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: 40, 
          borderRadius: 8, 
          textAlign: 'center' 
        }}>
          <div>Student not found</div>
          <button onClick={onClose} style={{ marginTop: 16, padding: '8px 16px' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="student-detail-overlay"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
        overflowY: 'auto'
      }}>
      <div 
        className="student-detail-modal"
        style={{ 
          backgroundColor: 'white', 
          borderRadius: 12, 
          width: '100%', 
          maxWidth: 1000, 
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: 20, 
          borderBottom: '1px solid #eee', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>{student.name}</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Roll: {student.roll_no} • PRN: {student.prn} • Class: {student.class_obj?.name} {student.class_obj?.section}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            ✖ Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'attendance', label: 'Attendance', icon: '📅' },
            { id: 'leaves', label: 'Medical Leaves', icon: '🏥' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 30 }}>
                <div>
                  {student.photo_path && (
                    <img 
                      src={getPhotoUrl(student.photo_path)} 
                      alt={student.name}
                      style={{ 
                        width: '100%', 
                        height: 200, 
                        objectFit: 'cover', 
                        borderRadius: 8,
                        border: '1px solid #ddd'
                      }}
                    />
                  )}
                </div>
                <div>
                  <h3>Student Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <strong>Name:</strong> {student.name}
                    </div>
                    <div>
                      <strong>Age:</strong> {student.age}
                    </div>
                    <div>
                      <strong>Roll Number:</strong> {student.roll_no}
                    </div>
                    <div>
                      <strong>PRN:</strong> {student.prn}
                    </div>
                    <div>
                      <strong>Seat Number:</strong> {student.seat_no}
                    </div>
                    <div>
                      <strong>Class:</strong> {student.class_obj?.name} {student.class_obj?.section}
                    </div>
                    {student.gender && (
                      <div>
                        <strong>Gender:</strong> {student.gender}
                      </div>
                    )}
                    {student.blood_group && (
                      <div>
                        <strong>Blood Group:</strong> {student.blood_group}
                      </div>
                    )}
                    {student.email && (
                      <div>
                        <strong>Email:</strong> {student.email}
                      </div>
                    )}
                    {student.phone && (
                      <div>
                        <strong>Phone:</strong> {student.phone}
                      </div>
                    )}
                    {student.parents_mobile && (
                      <div>
                        <strong>Parent/Guardian Mobile:</strong> {student.parents_mobile}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              {attendanceStats && (
                <div>
                  <h3>Attendance Summary</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 16 
                  }}>
                    <div style={{ 
                      padding: 20, 
                      backgroundColor: '#e3f2fd', 
                      borderRadius: 8, 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>
                        {getAttendanceRate()}%
                      </div>
                      <div style={{ color: '#666' }}>Effective Attendance</div>
                      {getApprovedLeaveSessions() > 0 && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          (includes {getApprovedLeaveSessions()} leave sessions)
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      padding: 20, 
                      backgroundColor: '#e8f5e8', 
                      borderRadius: 8, 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2e7d32' }}>
                        {attendanceStats.present_records || 0}
                      </div>
                      <div style={{ color: '#666' }}>Present</div>
                    </div>
                    <div style={{ 
                      padding: 20, 
                      backgroundColor: '#ffebee', 
                      borderRadius: 8, 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#c62828' }}>
                        {getAdjustedAbsent()}
                      </div>
                      <div style={{ color: '#666' }}>Adjusted Absent</div>
                      {getApprovedLeaveSessions() > 0 && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          ({attendanceStats.absent_records || 0} raw - {getApprovedLeaveSessions()} leave)
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      padding: 20, 
                      backgroundColor: '#fff3e0', 
                      borderRadius: 8, 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef6c00' }}>
                        {getApprovedLeaveSessions()}
                      </div>
                      <div style={{ color: '#666' }}>Leave Sessions</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                        ({leaveRecords.length} leave records)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <h3>Attendance Records</h3>
              {attendanceRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  No attendance records found.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {attendanceRecords.map((record) => (
                    <div key={record.id} style={{ 
                      padding: 16, 
                      border: '1px solid #ddd', 
                      borderRadius: 8,
                      backgroundColor: record.is_present ? '#e8f5e8' : '#ffebee'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{formatDate(record.created_at)}</strong>
                          <div style={{ color: '#666', marginTop: 4 }}>
                            {record.session_name} • {record.class_name} {record.class_section}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '4px 12px', 
                          borderRadius: 16, 
                          backgroundColor: record.is_present ? '#4caf50' : '#f44336',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          {record.is_present ? 'Present' : 'Absent'}
                        </div>
                      </div>
                      {record.confidence > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                          Confidence: {(record.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaves' && (
            <div>
              <h3>Medical Leave Records</h3>
              {leaveRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  No medical leave records found.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {leaveRecords.map((leave) => (
                    <div key={leave.id} style={{ 
                      padding: 16, 
                      border: '1px solid #ddd', 
                      borderRadius: 8,
                      backgroundColor: leave.leave_type === 'medical' ? '#fff3e0' : '#e3f2fd'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong>{formatDate(leave.leave_date)}</strong>
                          <div style={{ 
                            color: leave.leave_type === 'medical' ? '#ef6c00' : '#1976d2',
                            fontWeight: 'bold',
                            marginTop: 4
                          }}>
                            {leave.leave_type === 'medical' ? '🏥 Medical Leave' : '📋 Authorized Absence'}
                          </div>
                          {leave.note && (
                            <div style={{ marginTop: 8, color: '#666' }}>
                              <strong>Note:</strong> {leave.note}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {leave.document_path && (
                        <div style={{ marginTop: 12 }}>
                          <strong>Supporting Document:</strong>
                          <div style={{ marginTop: 8 }}>
                            <img 
                              src={getPhotoUrl(leave.document_path)} 
                              alt="Supporting document"
                              style={{ 
                                maxWidth: 200, 
                                maxHeight: 150, 
                                border: '1px solid #ddd', 
                                borderRadius: 4,
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(getPhotoUrl(leave.document_path), '_blank')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
