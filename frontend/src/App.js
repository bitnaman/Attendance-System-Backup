import React, { useState, useEffect } from 'react';
import './App.css';
import MarkAttendance from './components/MarkAttendance';
import ViewAttendance from './components/ViewAttendance';
import ManageStudents from './components/ManageStudents';
import BackupManager from './components/BackupManager';
import AdminUsers from './components/AdminUsers';
import Login from './Login';
import { AuthProvider, RequireAuth, useAuth } from './AuthContext';
import ExportPanel from './components/ExportPanel';
import MedicalLeave from './components/MedicalLeave';
import BatchAttendance from './components/BatchAttendance';
import UserProfile from './components/UserProfile';
import BootstrapAdmin from './components/BootstrapAdmin';
import { fetchStudents, fetchAttendanceData, fetchSessionRecords } from './api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

function AppShell() {
  // UI
  const [activeTab, setActiveTab] = useState('attendance');
  const [message, setMessage] = useState(null);

  // System stats (header)
  const [systemStats, setSystemStats] = useState({
    totalStudents: 0,
    isOnline: false,
    lastSync: new Date().toLocaleTimeString(),
  });

  // Students
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', class_id: '', photo: null,
  });
  const [updating, setUpdating] = useState(false);


  // Attendance
  const [attendanceForm, setAttendanceForm] = useState({ sessionName: '', classPhoto: null, class_id: '' });
  const [processing, setProcessing] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);

  // Attendance views
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Message helper
  const showMessage = (text, type = 'info', timeoutMs = 3500) => {
    setMessage({ text, type });
    if (timeoutMs) {
      setTimeout(() => setMessage(null), timeoutMs);
    }
  };

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    await Promise.all([loadStudents(), loadAttendanceData()]).catch(() => {});
  };

  const loadStudents = async () => {
    try {
      const data = await fetchStudents();
      setStudents(data);
      setSystemStats((s) => ({ ...s, totalStudents: data.length, isOnline: true, lastSync: new Date().toLocaleTimeString() }));
    } catch (e) {
      setSystemStats((s) => ({ ...s, isOnline: false }));
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoadingAttendance(true);
      const { sessions, stats } = await fetchAttendanceData();
      setAttendanceSessions(sessions);
      setAttendanceStats(stats);
      setSystemStats((s) => ({ ...s, isOnline: true, lastSync: new Date().toLocaleTimeString() }));
    } catch (e) {
      setSystemStats((s) => ({ ...s, isOnline: false }));
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadSessionRecords = async (sessionId) => {
    try {
      setSelectedSession(sessionId);
      const data = await fetchSessionRecords(sessionId);
      setAttendanceRecords(data);
    } catch (e) {
      showMessage('Failed to load session records', 'error');
    }
  };

  // Attendance submit
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceForm.sessionName || !attendanceForm.classPhoto || !attendanceForm.class_id) {
      showMessage('Please provide session name, select a class, and upload a class photo', 'error');
      return;
    }
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append('session_name', attendanceForm.sessionName);
      fd.append('class_id', String(attendanceForm.class_id));
      if (attendanceForm.subject_id) {
        fd.append('subject_id', String(attendanceForm.subject_id));
      }
      fd.append('photo', attendanceForm.classPhoto);
      
      const res = await fetch(`${API_BASE}/attendance/mark`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to mark attendance');
      }
      let data = {};
      try {
        data = await res.json();
      } catch (jsonError) {
        console.log("Could not parse JSON response, but request was successful.");
      }
      
      const pr = data.processing_result || {};
      const normalized = {
        identified_students: pr.identified_students || pr.students_identified || [],
        total_faces: pr.total_faces_detected || pr.total_faces || 0,
        identified_count: (pr.identified_students || []).length,
      };
      setAttendanceResult(normalized);
      showMessage('Attendance processed successfully', 'success');
      setAttendanceForm({ sessionName: '', classPhoto: null, class_id: '' });
      await loadAttendanceData();
    } catch (e) {
      console.error(e);
      showMessage('Network error processing attendance', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Manage students
  const startEditStudent = (student) => {
    setEditingStudent(student.id);
    setEditForm({
      name: student.name || '',
      age: student.age || '',
      roll_no: student.roll_no || '',
      prn: student.prn || '',
      seat_no: student.seat_no || '',
      email: student.email || '',
      phone: student.phone || '',
      class_id: student.class_id || '',
      photo: null,
    });
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setEditForm({ name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', class_id: '', photo: null });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const fd = new FormData();
      Object.entries({
        name: editForm.name,
        age: String(editForm.age || ''),
        roll_no: editForm.roll_no,
        prn: editForm.prn,
        seat_no: editForm.seat_no,
        email: editForm.email,
        phone: editForm.phone,
        class_id: editForm.class_id,
      }).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
      if (editForm.photo) fd.append('photo', editForm.photo);  // Fixed: backend expects 'photo' not 'image'
      const res = await fetch(`${API_BASE}/student/${editingStudent}`, { 
        method: 'PUT', 
        body: fd,
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update student');
      }
      showMessage('Student updated', 'success');
      cancelEdit();
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage('Error updating student', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStudent = async (studentId, name) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/student/${studentId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete');
      }
      showMessage(`Deleted ${name}`, 'success');
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage('Error deleting student', 'error');
    }
  };

  const handleToggleStatus = async (studentId, isActive) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/student/${studentId}/toggle-status`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to toggle');
      }
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage('Error toggling status', 'error');
    }
  };

  const handleUpgradeEmbeddings = async (studentId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/student/${studentId}/upgrade-embeddings`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (res.ok) {
        showMessage('Student embeddings upgraded to enhanced system!', 'success');
        await loadStudents();
      } else {
        const error = await res.json();
        // Handle validation errors that might be objects
        let errorMessage = 'Error upgrading embeddings';
        if (error.detail) {
          if (typeof error.detail === 'string') {
            errorMessage = error.detail;
          } else if (Array.isArray(error.detail)) {
            errorMessage = error.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
          } else if (typeof error.detail === 'object') {
            errorMessage = error.detail.msg || error.detail.message || 'Validation error';
          }
        }
        showMessage(errorMessage, 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage('Error upgrading embeddings', 'error');
    }
  };

  // Register new student (multi-photo)

  return (
    <div className="app">
      <header className="modern-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="logo-container">
              <div className="logo-icon">🎓</div>
              <div className="brand-text">
                <h1>BTech Attendance System</h1>
                <div className="brand-subtitle">IT Department - Smart Attendance Management</div>
              </div>
            </div>
          </div>
          <div className="modern-stats">
            <div className="mini-stat">
              <div className={`stat-indicator ${systemStats.isOnline ? '' : 'offline'}`}>
                <span className="pulse-dot"></span>
                <span className="pulse-ring"></span>
              </div>
              <div className="stat-details">
                <div className="stat-label">Status</div>
                <div className="stat-value">{systemStats.isOnline ? 'Online' : 'Offline'}</div>
              </div>
            </div>
            <div className="mini-stat">
              <div className="stat-icon">👥</div>
              <div className="stat-details">
                <div className="stat-label">Students</div>
                <div className="stat-value">{systemStats.totalStudents}</div>
              </div>
            </div>
            <div className="mini-stat">
              <div className="stat-icon">⏱️</div>
              <div className="stat-details">
                <div className="stat-label">Last Sync</div>
                <div className="stat-value">{systemStats.lastSync}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div className={`modern-message ${message.type}`}>
          <div className="message-content">
            <span className="message-icon">ℹ️</span>
            <span className="message-text">{message.text}</span>
          </div>
          <button className="modern-close" onClick={() => setMessage(null)}>✖</button>
        </div>
      )}

      <nav className="beautified-tabs">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🎓</div>
          <div className="sidebar-title">BTech Attendance</div>
        </div>
        <button className={`beautified-tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <span className="tab-icon">📸</span>
          <span className="tab-label">Mark Attendance</span>
          {activeTab === 'attendance' && <span className="nav-indicator" />}
        </button>
        <button className={`beautified-tab ${activeTab === 'view-attendance' ? 'active' : ''}`} onClick={() => setActiveTab('view-attendance')}>
          <span className="tab-icon">📊</span>
          <span className="tab-label">View Attendance</span>
          {activeTab === 'view-attendance' && <span className="nav-indicator" />}
        </button>
        {/* Exports tab removed; moved under User/Admin tab */}
        <button className={`beautified-tab ${activeTab === 'manage-students' ? 'active' : ''}`} onClick={() => setActiveTab('manage-students')}>
          <span className="tab-icon">🧑‍🎓</span>
          <span className="tab-label">Manage Students</span>
          {activeTab === 'manage-students' && <span className="nav-indicator" />}
        </button>
        {/* User/Admin tab: label depends on role */}
        <button className={`beautified-tab ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>
          <span className="tab-icon">🛡️</span>
          <span className="tab-label">{(() => {
            const u = useAuth()?.user;
            if (!u) return 'User';
            if (u.role === 'superadmin') return 'Admin';
            const name = (u.username || '').split(/\s|\.|_|-/)[0] || 'User';
            return name.charAt(0).toUpperCase() + name.slice(1);
          })()}</span>
          {activeTab === 'user' && <span className="nav-indicator" />}
        </button>
      </nav>

      <main className="main-content">
        <div className="tab-content">
          {activeTab === 'attendance' && (
            <>
              <MarkAttendance
                attendanceForm={attendanceForm}
                setAttendanceForm={setAttendanceForm}
                onSubmit={handleAttendanceSubmit}
                processing={processing}
                showMessage={showMessage}
              />
              {attendanceResult && (
                <div className="attendance-result">
                  <h3>Attendance Result</h3>
                  <div className="result-summary">
                    <div className="stat">
                      <span className="stat-value">{attendanceResult.identified_count}</span>
                      <span className="stat-label">Identified</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{attendanceResult.total_faces}</span>
                      <span className="stat-label">Detected</span>
                    </div>
                  </div>
                  <div className="identified-students">
                    <h4>Identified Students</h4>
                    <div className="student-list">
                      {attendanceResult.identified_students.map((student, index) => (
                        <div key={index} className="student-item">
                          <span>
                            <span className="student-name">{student.name}</span>
                            <span className="student-roll"> (Roll: {student.roll_no})</span>
                          </span>
                          <span className="confidence">{(student.confidence * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'view-attendance' && (
            <ViewAttendance
              loading={loadingAttendance}
              sessions={attendanceSessions}
              stats={attendanceStats}
              selectedSession={selectedSession}
              onSelectSession={loadSessionRecords}
              records={attendanceRecords}
            />
          )}


          {activeTab === 'manage-students' && (
            <ManageStudents
              students={students}
              onEdit={startEditStudent}
              onDelete={handleDeleteStudent}
              onToggle={handleToggleStatus}
              editingStudent={editingStudent}
              editForm={editForm}
              setEditForm={setEditForm}
              onUpdate={handleUpdateStudent}
              onCancel={cancelEdit}
              updating={updating}
              onUpgradeEmbeddings={handleUpgradeEmbeddings}
            />
          )}

          {activeTab === 'user' && (() => {
            const u = useAuth()?.user;
            if (!u) return null;
            return (
              <UserProfile 
                user={u} 
                showMessage={showMessage}
              />
            );
          })()}
        </div>
      </main>
    </div>
  );
}

function App() {
  const { token } = useAuth() || {};
  const [needsBootstrap, setNeedsBootstrap] = useState(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);

  // Check if bootstrap is needed
  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        // Try to get current user to see if any users exist
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token || 'dummy'}` }
        });
        
        if (response.status === 401) {
          // No valid token, check if we can bootstrap
          const bootstrapResponse = await fetch(`${API_BASE}/auth/bootstrap-superadmin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test', password: 'test' })
          });
          
          if (bootstrapResponse.status === 403) {
            // Users exist, show login
            setNeedsBootstrap(false);
          } else {
            // No users exist, show bootstrap
            setNeedsBootstrap(true);
          }
        } else {
          // Valid token, user is logged in
          setNeedsBootstrap(false);
        }
      } catch (error) {
        // Network error or other issue, assume bootstrap needed
        setNeedsBootstrap(true);
      } finally {
        setCheckingBootstrap(false);
      }
    };

    if (!token) {
      checkBootstrap();
    } else {
      setNeedsBootstrap(false);
      setCheckingBootstrap(false);
    }
  }, [token]);

  if (checkingBootstrap) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: 18,
        color: '#6c757d'
      }}>
        🔄 Checking system status...
      </div>
    );
  }

  if (!token && needsBootstrap === true) {
    return <BootstrapAdmin />;
  }

  if (!token && needsBootstrap === false) {
    return <Login />;
  }

  return <AppShell />;
}

export default function RootApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
