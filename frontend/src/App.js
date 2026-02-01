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
import UpgradeEmbeddingsModal from './components/UpgradeEmbeddingsModal';
import EditStudentModal from './components/EditStudentModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import './styles/upgrade-modal.css';
import './styles/edit-student-modal.css';
import './styles/attendance-confirm-modal.css';
import { fetchStudents, fetchAttendanceData, fetchSessionRecords, deleteStudent, toggleStudentStatus } from './api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

function AppShell() {
  // Get current user for role-based rendering
  const { user: currentUser } = useAuth();
  const isStudent = currentUser?.role === 'student';
  
  // UI - For students, default to 'user' tab
  const [activeTab, setActiveTab] = useState(isStudent ? 'user' : 'attendance');
  const [message, setMessage] = useState(null);

  // System stats (header)
  const [systemStats, setSystemStats] = useState({
    totalStudents: 0,
    isOnline: false,
    lastSync: new Date().toLocaleTimeString(),
  });

  // Students
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null); // Now stores full student object for modal
  const [updating, setUpdating] = useState(false);
  
  // Upgrade Embeddings Modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeStudent, setUpgradeStudent] = useState(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Attendance
  const [attendanceForm, setAttendanceForm] = useState({ sessionName: '', classPhoto: null, class_id: '' });
  const [processing, setProcessing] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);
  
  // Attendance Preview/Confirm flow
  const [attendancePreviewData, setAttendancePreviewData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

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

  // Model compatibility warning state
  const [compatibilityWarning, setCompatibilityWarning] = useState(null);

  // Check model compatibility on load
  const checkModelCompatibility = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/config/compatibility`, {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.compatible || data.unknown_model_students > 0) {
          setCompatibilityWarning(data);
        }
      }
    } catch (e) {
      console.log('Compatibility check skipped');
    }
  };

  // Initial load
  useEffect(() => {
    refreshAll();
    checkModelCompatibility();
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

  // Attendance Preview - Step 1: Process photo and show confirmation modal
  const handleAttendancePreview = async (e) => {
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
      
      const res = await fetch(`${API_BASE}/attendance/preview`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to process photo');
      }
      
      const previewData = await res.json();
      console.log('Preview data received:', previewData);
      
      // Store preview data and show confirmation modal
      setAttendancePreviewData(previewData);
      setShowConfirmModal(true);
      
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error processing photo', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Attendance Confirm - Step 2: Save attendance with selected students
  const handleConfirmAttendance = async (presentStudentIds) => {
    if (!attendancePreviewData?.preview_id) {
      showMessage('Preview data not found. Please process the photo again.', 'error');
      return;
    }

    setConfirmProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview_id: attendancePreviewData.preview_id,
          present_student_ids: presentStudentIds
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to confirm attendance');
      }

      const result = await res.json();
      console.log('Attendance confirmed:', result);

      // Build attendance result for display
      const normalizedResult = {
        identified_students: attendancePreviewData.all_students?.filter(s => presentStudentIds.includes(s.id)) || [],
        total_faces: attendancePreviewData.total_faces_detected || 0,
        identified_count: presentStudentIds.length,
      };
      setAttendanceResult(normalizedResult);

      showMessage(`Attendance saved! ${result.present_count} present, ${result.absent_count} absent`, 'success');
      
      // Reset form and close modal
      setShowConfirmModal(false);
      setAttendancePreviewData(null);
      setAttendanceForm({ sessionName: '', classPhoto: null, class_id: '', subject_id: '' });
      
      await loadAttendanceData();
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error confirming attendance', 'error');
    } finally {
      setConfirmProcessing(false);
    }
  };

  // Legacy direct submit (kept for backward compatibility)
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
    setEditingStudent(student); // Store full student object for modal
  };

  const cancelEdit = () => {
    setEditingStudent(null);
  };

  const handleUpdateStudent = async (studentId, formData) => {
    // formData is already a FormData object from the modal
    setUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/student/${studentId}`, { 
        method: 'PUT', 
        body: formData,
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update student');
      }
      showMessage('Student updated successfully', 'success');
      cancelEdit();
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error updating student', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Open delete confirmation modal (triggers 2-step confirmation)
  const openDeleteModal = (studentId, name) => {
    setStudentToDelete({ id: studentId, name: name });
    setDeleteModalOpen(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setStudentToDelete(null);
    setIsDeleting(false);
  };

  // Actual delete handler (called after 2-step confirmation)
  const handleDeleteStudent = async (studentId, name) => {
    try {
      setIsDeleting(true);
      await deleteStudent(studentId);
      showMessage(`Successfully deleted ${name}`, 'success');
      closeDeleteModal();
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error deleting student', 'error');
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (studentId, isActive) => {
    try {
      await toggleStudentStatus(studentId);
      await loadStudents();
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error toggling status', 'error');
    }
  };

  const handleUpgradeEmbeddings = (studentId) => {
    // Find the student and open the modal
    const student = students.find(s => s.id === studentId);
    if (student) {
      setUpgradeStudent(student);
      setUpgradeModalOpen(true);
    } else {
      showMessage('Student not found', 'error');
    }
  };

  const handleUpgradeSuccess = async (message) => {
    showMessage(message, 'success');
    await loadStudents();
  };

  const handleUpgradeError = (message) => {
    showMessage(message, 'error');
  };

  // Register new student (multi-photo)

  return (
    <div className="app">
      {/* Model Compatibility Warning Banner */}
      {compatibilityWarning && (
        <div className="compatibility-warning-banner">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <div className="warning-text">
              <strong>Model Compatibility Issue:</strong>{' '}
              {compatibilityWarning.incompatible_students > 0 
                ? `${compatibilityWarning.incompatible_students} student(s) were registered with a different model (${compatibilityWarning.issues?.[0]?.registered_model}) and may not be recognized. Current model: ${compatibilityWarning.current_model}`
                : `${compatibilityWarning.unknown_model_students} student(s) have unknown model info.`
              }
            </div>
            <button 
              className="warning-dismiss" 
              onClick={() => setCompatibilityWarning(null)}
              title="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="warning-action">
            <span>Use "Upgrade AI" on affected students to fix.</span>
          </div>
        </div>
      )}
      
      <header className="modern-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="logo-container">
              <img src="/logo.jpeg" alt="Bharati Vidyapeeth" className="logo-img" />
              <div className="brand-text">
                <h1>Bharati <span className="brand-highlight">Facify</span></h1>
                <div className="brand-subtitle">AI-Powered Attendance System</div>
              </div>
            </div>
          </div>
          <div className="modern-stats desktop-only">
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
          <img src="/logo.jpeg" alt="Logo" className="sidebar-logo-img" />
          <div className="sidebar-title">Bharati Facify</div>
        </div>
        {/* Hide other tabs from students - only show Profile/User tab */}
        {!isStudent && (
          <button className={`beautified-tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            <span className="tab-icon">📸</span>
            <span className="tab-label">Mark Attendance</span>
            {activeTab === 'attendance' && <span className="nav-indicator" />}
          </button>
        )}
        {!isStudent && (
          <button className={`beautified-tab ${activeTab === 'view-attendance' ? 'active' : ''}`} onClick={() => setActiveTab('view-attendance')}>
            <span className="tab-icon">📊</span>
            <span className="tab-label">View Attendance</span>
            {activeTab === 'view-attendance' && <span className="nav-indicator" />}
          </button>
        )}
        {/* Exports tab removed; moved under User/Admin tab */}
        {!isStudent && (
          <button className={`beautified-tab ${activeTab === 'manage-students' ? 'active' : ''}`} onClick={() => setActiveTab('manage-students')}>
            <span className="tab-icon">🧑‍🎓</span>
            <span className="tab-label">Manage Students</span>
            {activeTab === 'manage-students' && <span className="nav-indicator" />}
          </button>
        )}
        {/* User/Admin tab: label depends on role */}
        <button className={`beautified-tab ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>
          <span className="tab-icon">{isStudent ? '🎓' : '🛡️'}</span>
          <span className="tab-label">{(() => {
            if (!currentUser) return 'User';
            if (currentUser.role === 'superadmin') return 'Admin';
            if (currentUser.role === 'student') return 'Profile';
            const name = (currentUser.username || '').split(/\s|\.|_|-/)[0] || 'User';
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
                onPreview={handleAttendancePreview}
                processing={processing}
                showMessage={showMessage}
                previewData={attendancePreviewData}
                showConfirmModal={showConfirmModal}
                setShowConfirmModal={setShowConfirmModal}
                onConfirmAttendance={handleConfirmAttendance}
                confirmProcessing={confirmProcessing}
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
              onDelete={openDeleteModal}
              onToggle={handleToggleStatus}
              onUpgradeEmbeddings={handleUpgradeEmbeddings}
              userRole={currentUser?.role}
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
      
      {/* Upgrade Embeddings Modal */}
      <UpgradeEmbeddingsModal
        isOpen={upgradeModalOpen}
        onClose={() => {
          setUpgradeModalOpen(false);
          setUpgradeStudent(null);
        }}
        student={upgradeStudent}
        onSuccess={handleUpgradeSuccess}
        onError={handleUpgradeError}
      />
      
      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onUpdate={handleUpdateStudent}
          onCancel={cancelEdit}
          updating={updating}
        />
      )}
      
      {/* Delete Confirmation Modal (2-step) */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteStudent}
        studentName={studentToDelete?.name || ''}
        studentId={studentToDelete?.id}
        isDeleting={isDeleting}
      />
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
