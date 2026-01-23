import React, { useState, useEffect } from 'react';
import { fetchStudents, fetchExportClasses } from '../api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function MedicalLeave({ showMessage }) {
  const [activeTab, setActiveTab] = useState('create');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [leaveForm, setLeaveForm] = useState({
    classId: '',
    studentId: '',
    leaveType: 'medical',
    leaveDate: new Date().toISOString().split('T')[0],
    leaveEndDate: '',
    sessionsCount: 1,
    note: '',
    document: null
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    classId: '',
    studentId: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (leaveForm.classId) {
      loadStudentsForClass(leaveForm.classId);
    } else {
      setStudents([]);
    }
  }, [leaveForm.classId]);

  // Load students for filter section
  useEffect(() => {
    if (filters.classId) {
      loadStudentsForClass(filters.classId);
    } else {
      setStudents([]);
    }
  }, [filters.classId]);

  useEffect(() => {
    if (activeTab === 'list') {
      loadLeaves();
    }
  }, [activeTab, filters]);

  const loadInitialData = async () => {
    try {
      const [classesData] = await Promise.all([
        fetchExportClasses()
      ]);
      setClasses(classesData.classes || []);
    } catch (e) {
      showMessage('Failed to load initial data', 'error');
    }
  };

  const loadStudentsForClass = async (classId) => {
    try {
      const response = await fetch(`${API_BASE}/student/filter?class_id=${classId}&page=1&page_size=200`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      const data = await response.json();
      setStudents(data.students || []);
    } catch (e) {
      showMessage('Failed to load students', 'error');
    }
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.studentId) params.set('student_id', filters.studentId);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);
      
      const response = await fetch(`${API_BASE}/medical/leave?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
      });
      const data = await response.json();
      setLeaves(data || []);
    } catch (e) {
      showMessage('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.studentId || !leaveForm.leaveType) {
      showMessage('Please select student and leave type', 'error');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('student_id', leaveForm.studentId);
      formData.append('leave_type', leaveForm.leaveType);
      formData.append('leave_date', leaveForm.leaveDate);
      formData.append('sessions_count', leaveForm.sessionsCount || 1);
      if (leaveForm.leaveEndDate) formData.append('leave_end_date', leaveForm.leaveEndDate);
      if (leaveForm.note) formData.append('note', leaveForm.note);
      if (leaveForm.document) formData.append('document', leaveForm.document);

      const response = await fetch(`${API_BASE}/medical/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to create leave record');
      }

      showMessage('Leave record created successfully', 'success');
      setLeaveForm({
        classId: leaveForm.classId,
        studentId: '',
        leaveType: 'medical',
        leaveDate: new Date().toISOString().split('T')[0],
        leaveEndDate: '',
        sessionsCount: 1,
        note: '',
        document: null
      });
      
      // Refresh leaves list if on list tab
      if (activeTab === 'list') {
        loadLeaves();
      }
    } catch (e) {
      showMessage(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/static/')) return `${API_BASE}${photoPath}`;
    return `${API_BASE}/static/${photoPath}`;
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button 
          className={`beautified-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-label">Mark Leave</span>
        </button>
        <button 
          className={`beautified-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">View Leaves</span>
        </button>
      </div>

      {activeTab === 'create' && (
        <div>
          <h3>Mark Medical/Authorized Leave</h3>
          <form onSubmit={handleCreateLeave} style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Class</label>
                <select 
                  value={leaveForm.classId || ''} 
                  onChange={(e) => {
                    setLeaveForm({ ...leaveForm, classId: e.target.value, studentId: '' });
                  }}
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name || `${c.name} - ${c.section}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Student</label>
                <select 
                  value={leaveForm.studentId} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, studentId: e.target.value })}
                  disabled={!leaveForm.classId || !students.length}
                >
                  <option value="">
                    {!leaveForm.classId 
                      ? "-- Select Class First --" 
                      : students.length === 0 
                        ? "-- No Students Found --" 
                        : "-- Select Student --"
                    }
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (Roll: {s.roll_no})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Leave Type</label>
                <select 
                  value={leaveForm.leaveType} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                >
                  <option value="medical">Medical Leave</option>
                  <option value="authorized">Authorized Absence</option>
                </select>
              </div>
              <div>
                <label>Number of Sessions Covered</label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={leaveForm.sessionsCount} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, sessionsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                />
                <small style={{ color: '#666' }}>How many attendance sessions does this leave cover?</small>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Leave Start Date</label>
                <input 
                  type="date" 
                  value={leaveForm.leaveDate} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveDate: e.target.value })}
                />
              </div>
              <div>
                <label>Leave End Date (Optional)</label>
                <input 
                  type="date" 
                  value={leaveForm.leaveEndDate} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveEndDate: e.target.value })}
                  min={leaveForm.leaveDate}
                />
                <small style={{ color: '#666' }}>For multi-day leave</small>
              </div>
            </div>

            <div>
              <label>Note/Reason</label>
              <textarea 
                value={leaveForm.note} 
                onChange={(e) => setLeaveForm({ ...leaveForm, note: e.target.value })}
                placeholder="Enter reason for leave (optional)"
                rows={3}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>

            <div>
              <label>Supporting Document (Medical Certificate/Prescription)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setLeaveForm({ ...leaveForm, document: e.target.files[0] })}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
              <small style={{ color: '#666' }}>Upload image of medical certificate, prescription, or other supporting document</small>
            </div>

            <button 
              type="submit" 
              disabled={loading || !leaveForm.studentId}
              style={{ 
                padding: 12, 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Leave Record'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div>
          <h3>Leave Records</h3>
          
          {/* Filters */}
          <div style={{ display: 'grid', gap: 16, marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <h4>Filters</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Class</label>
                <select 
                  value={filters.classId} 
                  onChange={(e) => {
                    setFilters({ ...filters, classId: e.target.value, studentId: '' });
                  }}
                >
                  <option value="">-- All Classes --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name || `${c.name} - ${c.section}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Student</label>
                <select 
                  value={filters.studentId} 
                  onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                  disabled={!filters.classId || !students.length}
                >
                  <option value="">
                    {!filters.classId 
                      ? "-- Select Class First --" 
                      : students.length === 0 
                        ? "-- No Students Found --" 
                        : "-- All Students --"
                    }
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (Roll: {s.roll_no})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>From Date</label>
                <input 
                  type="date" 
                  value={filters.dateFrom} 
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <label>To Date</label>
                <input 
                  type="date" 
                  value={filters.dateTo} 
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Leave Records */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Loading leave records...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                  No leave records found for the selected filters.
                </div>
              ) : (
                leaves.map((leave) => (
                  <div key={leave.id} style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: 8, 
                    padding: 16, 
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#333' }}>{leave.student_name}</h4>
                        <p style={{ margin: '4px 0', color: '#666' }}>
                          {new Date(leave.leave_date).toLocaleDateString()}
                          {leave.leave_end_date && ` - ${new Date(leave.leave_end_date).toLocaleDateString()}`}
                          {' • '}
                          <span style={{ 
                            color: leave.leave_type === 'medical' ? '#dc3545' : '#ffc107',
                            fontWeight: 'bold'
                          }}>
                            {leave.leave_type === 'medical' ? '🏥 Medical Leave' : '📋 Authorized Absence'}
                          </span>
                        </p>
                        <p style={{ margin: '4px 0', color: '#666' }}>
                          <strong>Sessions Covered:</strong> {leave.sessions_count || 1}
                          {' • '}
                          <span style={{
                            color: leave.is_approved !== false ? '#28a745' : '#dc3545',
                            fontWeight: 'bold'
                          }}>
                            {leave.is_approved !== false ? '✅ Approved' : '⏳ Pending Approval'}
                          </span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {leave.is_approved === false && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`${API_BASE}/medical/leave/${leave.id}/approve`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
                                });
                                if (response.ok) {
                                  showMessage('Leave approved successfully', 'success');
                                  loadLeaves();
                                } else {
                                  throw new Error('Failed to approve');
                                }
                              } catch (e) {
                                showMessage('Failed to approve leave', 'error');
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to delete this leave record?')) return;
                            try {
                              const response = await fetch(`${API_BASE}/medical/leave/${leave.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
                              });
                              if (response.ok) {
                                showMessage('Leave deleted successfully', 'success');
                                loadLeaves();
                              } else {
                                throw new Error('Failed to delete');
                              }
                            } catch (e) {
                              showMessage('Failed to delete leave', 'error');
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {leave.note && (
                      <div style={{ marginBottom: 12 }}>
                        <strong>Note:</strong> {leave.note}
                      </div>
                    )}
                    
                    {leave.document_path && (
                      <div>
                        <strong>Document:</strong>
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
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
