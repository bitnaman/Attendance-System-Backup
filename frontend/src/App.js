import React, { useState, useEffect } from 'react';
import './App.css';
import MarkAttendance from './components/MarkAttendance';
import ViewAttendance from './components/ViewAttendance';
import ManageStudents from './components/ManageStudents';
import RegisterStudent from './components/RegisterStudent';
import BackupManager from './components/BackupManager';
import { fetchStudents, fetchAttendanceData, fetchSessionRecords } from './api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

function App() {
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
    name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', photo: null,
  });
  const [updating, setUpdating] = useState(false);

  // Register student
  const [studentForm, setStudentForm] = useState({
    name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', photos: [], class_id: ''
  });
  const [registering, setRegistering] = useState(false);

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
      photo: null,
    });
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setEditForm({ name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', photo: null });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setUpdating(true);
    try {
      const fd = new FormData();
      Object.entries({
        name: editForm.name,
        age: String(editForm.age || ''),
        roll_no: editForm.roll_no,
        prn: editForm.prn,
        seat_no: editForm.seat_no,
        email: editForm.email,
        phone: editForm.phone,
      }).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
      if (editForm.photo) fd.append('image', editForm.photo);
      const res = await fetch(`${API_BASE}/student/${editingStudent}`, { method: 'PUT', body: fd });
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
      const res = await fetch(`${API_BASE}/student/${studentId}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_BASE}/student/${studentId}/toggle-status`, { method: 'POST' });
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

  // Register new student (multi-photo)
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.age || !studentForm.roll_no || !studentForm.prn || !studentForm.seat_no || !studentForm.class_id || (studentForm.photos || []).length === 0) {
      showMessage('Please fill all required fields including class selection', 'error');
      return;
    }
    setRegistering(true);
    const fd = new FormData();
    fd.append('name', studentForm.name);
    fd.append('age', String(studentForm.age));
    fd.append('roll_no', studentForm.roll_no);
    fd.append('prn', studentForm.prn);
    fd.append('seat_no', studentForm.seat_no);
    fd.append('class_id', String(studentForm.class_id));
    if (studentForm.email) fd.append('email', studentForm.email);
    if (studentForm.phone) fd.append('phone', studentForm.phone);
    const first = studentForm.photos?.[0];
    if (first) fd.append('image', first);
    (studentForm.photos || []).forEach((f) => fd.append('images', f));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(`${API_BASE}/student/`, { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Registration failed');
      }
      await res.json();
      showMessage('Student registered successfully!', 'success');
      setStudentForm({ name: '', age: '', roll_no: '', prn: '', seat_no: '', email: '', phone: '', photos: [], class_id: '' });
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Network error registering student', 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="app">
      <header className="modern-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="logo-container">
              <div className="logo-icon">🎓</div>
              <div className="brand-text">
                <h1>BTech Attendance System</h1>
                <div className="brand-subtitle">IT & AIML Department - Smart Attendance Management</div>
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
        <button className={`beautified-tab ${activeTab === 'manage-students' ? 'active' : ''}`} onClick={() => setActiveTab('manage-students')}>
          <span className="tab-icon">🧑‍🎓</span>
          <span className="tab-label">Manage Students</span>
          {activeTab === 'manage-students' && <span className="nav-indicator" />}
        </button>
        <button className={`beautified-tab ${activeTab === 'register-student' ? 'active' : ''}`} onClick={() => setActiveTab('register-student')}>
          <span className="tab-icon">➕</span>
          <span className="tab-label">Register Student</span>
          {activeTab === 'register-student' && <span className="nav-indicator" />}
        </button>
        <button className={`beautified-tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
            <span className="tab-icon">💾</span>
            <span className="tab-label">Backup</span>
            {activeTab === 'backup' && <span className="nav-indicator" />}
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
                onQuickAttendance={(pr) => {
                  const normalized = {
                    identified_students: pr.identified_students || pr.students_identified || [],
                    total_faces: pr.total_faces_detected || pr.total_faces || 0,
                    identified_count: (pr.identified_students || pr.students_identified || []).length,
                  };
                  setAttendanceResult(normalized);
                  showMessage('Quick upload processed', 'success');
                  loadAttendanceData();
                }}
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
            />
          )}

          {activeTab === 'register-student' && (
            <RegisterStudent
              studentForm={studentForm}
              setStudentForm={setStudentForm}
              onSubmit={handleStudentSubmit}
              registering={registering}
            />
          )}

          {activeTab === 'backup' && (
            <BackupManager showMessage={showMessage} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
