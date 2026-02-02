import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * StudentDetailsModal - Modern student details modal
 * Matches the new manage students design
 */
export default function StudentDetailsModal({ studentId, onClose }) {
  const [student, setStudent] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load all data
  const loadStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token') || '';
      const headers = { Authorization: `Bearer ${token}` };
      
      const [studentRes, statsRes, recordsRes, leavesRes] = await Promise.all([
        fetch(`${API_BASE}/student/${studentId}`, { headers }),
        fetch(`${API_BASE}/attendance/student-stats/${studentId}`, { headers }),
        fetch(`${API_BASE}/attendance/records?student_id=${studentId}&limit=100`, { headers }),
        fetch(`${API_BASE}/medical/leave?student_id=${studentId}`, { headers })
      ]);
      
      if (studentRes.ok) setStudent(await studentRes.json());
      if (statsRes.ok) setAttendanceStats(await statsRes.json());
      if (recordsRes.ok) setAttendanceRecords(await recordsRes.json());
      if (leavesRes.ok) setLeaveRecords(await leavesRes.json());
    } catch (e) {
      console.error('Failed to load student data:', e);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [studentId, loadStudentData]);

  // Utility functions
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
    if (attendanceStats.effective_attendance_rate !== undefined) {
      return Math.round(attendanceStats.effective_attendance_rate);
    }
    const total = attendanceStats.total_records || 0;
    const present = attendanceStats.present_records || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getRateStatus = (rate) => {
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'warning';
    return 'poor';
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="ms-modal-overlay" onClick={handleBackdropClick}>
        <div className="ms-modal" style={{ maxWidth: '500px' }}>
          <div className="ms-loading">
            <div className="ms-loading-spinner"></div>
            <p>Loading student details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="ms-modal-overlay" onClick={handleBackdropClick}>
        <div className="ms-modal" style={{ maxWidth: '400px' }}>
          <div className="ms-modal-header">
            <h2 className="ms-modal-title">Error</h2>
            <button className="ms-modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="ms-modal-body" style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '3rem' }}>😕</span>
            <p style={{ color: 'var(--ms-gray-600)', marginTop: '16px' }}>Student not found</p>
          </div>
        </div>
      </div>
    );
  }

  const initials = student.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const rate = getAttendanceRate();
  const rateStatus = getRateStatus(rate);
  const approvedLeaves = attendanceStats?.approved_leave_sessions || 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'leaves', label: 'Leaves', icon: '🏥' }
  ];

  return (
    <div className="ms-modal-overlay" onClick={handleBackdropClick}>
      <div className="ms-modal" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div className="ms-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {student.photo_path ? (
                <img 
                  src={getPhotoUrl(student.photo_path)}
                  alt={student.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{initials}</span>
              )}
            </div>
            <div>
              <h2 className="ms-modal-title" style={{ marginBottom: '4px' }}>
                {student.name}
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                Roll: {student.roll_no} • {student.class_obj?.name} {student.class_obj?.section}
              </p>
            </div>
          </div>
          <button className="ms-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--ms-gray-200)',
          background: 'var(--ms-gray-50)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 24px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid var(--ms-primary)' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: activeTab === tab.id ? 'var(--ms-primary)' : 'var(--ms-gray-600)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="ms-modal-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <InfoCard icon="🆔" label="PRN" value={student.prn || 'N/A'} />
                <InfoCard icon="💺" label="Seat No" value={student.seat_no || 'N/A'} />
                <InfoCard icon="🎂" label="Age" value={student.age || 'N/A'} />
                {student.gender && <InfoCard icon="👤" label="Gender" value={student.gender} />}
                {student.blood_group && <InfoCard icon="🩸" label="Blood Group" value={student.blood_group} />}
                {student.email && <InfoCard icon="📧" label="Email" value={student.email} />}
                {student.phone && <InfoCard icon="📱" label="Phone" value={student.phone} />}
                {student.parents_mobile && <InfoCard icon="👨‍👩‍👧" label="Parent Contact" value={student.parents_mobile} />}
              </div>

              {/* Attendance Summary */}
              {attendanceStats && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    color: 'var(--ms-gray-800)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📊 Attendance Summary
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px'
                  }}>
                    <StatCard 
                      value={`${rate}%`}
                      label="Attendance Rate"
                      color={rateStatus === 'excellent' ? 'var(--ms-success)' : 
                             rateStatus === 'good' ? 'var(--ms-info)' :
                             rateStatus === 'warning' ? 'var(--ms-warning)' : 'var(--ms-danger)'}
                      sublabel={approvedLeaves > 0 ? `includes ${approvedLeaves} leaves` : null}
                    />
                    <StatCard 
                      value={attendanceStats.total_records || 0}
                      label="Total Sessions"
                      color="var(--ms-gray-600)"
                    />
                    <StatCard 
                      value={attendanceStats.present_records || 0}
                      label="Present"
                      color="var(--ms-success)"
                    />
                    <StatCard 
                      value={attendanceStats.adjusted_absent ?? (attendanceStats.absent_records || 0)}
                      label="Absent"
                      color="var(--ms-danger)"
                    />
                    <StatCard 
                      value={approvedLeaves}
                      label="Leave Sessions"
                      color="var(--ms-warning)"
                    />
                  </div>
                </div>
              )}

              {/* AI Status */}
              {student.has_enhanced_embeddings && (
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
                  borderRadius: 'var(--ms-radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🚀</span>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--ms-primary)' }}>Enhanced AI Recognition</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ms-gray-600)' }}>
                      Confidence: {student.embedding_confidence ? `${(student.embedding_confidence * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              {attendanceRecords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: 'var(--ms-gray-500)' 
                }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📅</span>
                  <p>No attendance records found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {attendanceRecords.map((record) => (
                    <AttendanceRecord key={record.id} record={record} formatDate={formatDate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div>
              {leaveRecords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: 'var(--ms-gray-500)' 
                }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🏥</span>
                  <p>No leave records found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {leaveRecords.map((leave) => (
                    <LeaveRecord key={leave.id} leave={leave} formatDate={formatDate} getPhotoUrl={getPhotoUrl} />
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

// Sub-components
function InfoCard({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'var(--ms-gray-50)',
      borderRadius: 'var(--ms-radius)',
      transition: 'all 0.2s ease'
    }}>
      <span style={{ 
        fontSize: '1.25rem',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        borderRadius: '8px'
      }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ms-gray-500)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontWeight: '600', color: 'var(--ms-gray-800)' }}>{value}</div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, sublabel }) {
  return (
    <div style={{
      padding: '20px',
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      borderRadius: 'var(--ms-radius-lg)',
      textAlign: 'center',
      border: `1px solid ${color}20`
    }}>
      <div style={{ 
        fontSize: '1.75rem', 
        fontWeight: '700', 
        color: color,
        lineHeight: 1
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: '0.8rem', 
        color: 'var(--ms-gray-600)',
        marginTop: '4px'
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--ms-gray-400)',
          marginTop: '4px'
        }}>
          ({sublabel})
        </div>
      )}
    </div>
  );
}

function AttendanceRecord({ record, formatDate }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: record.is_present ? 'var(--ms-success-bg)' : 'var(--ms-danger-bg)',
      borderRadius: 'var(--ms-radius)',
      border: `1px solid ${record.is_present ? 'var(--ms-success)' : 'var(--ms-danger)'}20`
    }}>
      <div>
        <div style={{ fontWeight: '600', color: 'var(--ms-gray-800)' }}>
          {record.session_name}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--ms-gray-500)', marginTop: '4px' }}>
          {formatDate(record.created_at)} • {record.class_name} {record.class_section}
        </div>
        {record.confidence > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--ms-gray-400)', marginTop: '4px' }}>
            Confidence: {(record.confidence * 100).toFixed(1)}%
          </div>
        )}
      </div>
      <div style={{
        padding: '6px 14px',
        borderRadius: 'var(--ms-radius-full)',
        background: record.is_present ? 'var(--ms-success)' : 'var(--ms-danger)',
        color: 'white',
        fontSize: '0.8rem',
        fontWeight: '600'
      }}>
        {record.is_present ? '✓ Present' : '✕ Absent'}
      </div>
    </div>
  );
}

function LeaveRecord({ leave, formatDate, getPhotoUrl }) {
  const isMedical = leave.leave_type === 'medical';
  
  return (
    <div style={{
      padding: '16px',
      background: isMedical ? 'var(--ms-warning-bg)' : 'var(--ms-info-bg)',
      borderRadius: 'var(--ms-radius)',
      border: `1px solid ${isMedical ? 'var(--ms-warning)' : 'var(--ms-info)'}20`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: '600', color: 'var(--ms-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{isMedical ? '🏥' : '📋'}</span>
            {isMedical ? 'Medical Leave' : 'Authorized Absence'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ms-gray-500)', marginTop: '8px' }}>
            {formatDate(leave.leave_date)}
          </div>
          {leave.note && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              background: 'rgba(255,255,255,0.5)', 
              borderRadius: 'var(--ms-radius-sm)',
              fontSize: '0.9rem',
              color: 'var(--ms-gray-700)'
            }}>
              {leave.note}
            </div>
          )}
        </div>
        {leave.approved && (
          <div style={{
            padding: '4px 10px',
            background: 'var(--ms-success)',
            color: 'white',
            borderRadius: 'var(--ms-radius-full)',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            ✓ Approved
          </div>
        )}
      </div>
      
      {leave.document_path && (
        <div style={{ marginTop: '12px' }}>
          <img 
            src={getPhotoUrl(leave.document_path)}
            alt="Document"
            style={{
              maxWidth: '150px',
              maxHeight: '100px',
              borderRadius: 'var(--ms-radius-sm)',
              border: '1px solid var(--ms-gray-200)',
              cursor: 'pointer'
            }}
            onClick={() => window.open(getPhotoUrl(leave.document_path), '_blank')}
          />
        </div>
      )}
    </div>
  );
}
