import React, { useState } from 'react';
import { RequireAuth, useAuth } from '../AuthContext';
import AdminUsers from './AdminUsers';
import ExportPanel from './ExportPanel';
import AttendanceExport from './AttendanceExport';
import MedicalLeave from './MedicalLeave';
import BackupManager from './BackupManager';
import ClassManagement from './ClassManagement';
import RegisterStudentAdmin from './RegisterStudentAdmin';
import SubjectManagement from './SubjectManagement';
import StudentSelfRegister from './StudentSelfRegister';
import '../styles/user-profile.css';

export default function UserProfile({ user, showMessage }) {
  const { logout } = useAuth();
  // For students, default to self-register section; for others, default to profile
  const [activeSection, setActiveSection] = useState(user?.role === 'student' ? 'self-register' : 'profile');

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'superadmin': return 'superadmin';
      case 'teacher': return 'teacher';
      case 'student': return 'student';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'superadmin': return 'Super Administrator';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      default: return 'User';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? This will clear all session data and refresh the page.')) {
      logout();
    }
  };

  // Tab configuration for cleaner rendering
  // For students: only show profile and self-register tabs
  // For teachers: show standard tabs but no admin features
  // For superadmin: show all tabs
  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profile', roles: ['superadmin', 'teacher', 'student'] },
    { id: 'self-register', icon: '📝', label: 'Register Yourself', roles: ['student'] },
    { id: 'exports', icon: '📊', label: 'Student Exports', roles: ['superadmin', 'teacher'] },
    { id: 'attendance-exports', icon: '📈', label: 'Attendance Exports', roles: ['superadmin', 'teacher'] },
    { id: 'medical', icon: '🏥', label: 'Medical Leave', roles: ['superadmin', 'teacher'] },
    { id: 'register', icon: '➕', label: 'Register Student', roles: ['superadmin', 'teacher'] },
    { id: 'classes', icon: '🏫', label: 'Manage Classes', roles: ['superadmin'] },
    { id: 'subjects', icon: '📚', label: 'Subjects', roles: ['superadmin'] },
    { id: 'admin', icon: '👑', label: 'Admin', roles: ['superadmin'] },
    { id: 'backup', icon: '💾', label: 'Backup', roles: ['superadmin'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(user.role));

  const superadminAccess = [
    'Full system access',
    'User management',
    'System configuration',
    'Backup and restore',
    'All teacher capabilities'
  ];

  const teacherAccess = [
    'Mark attendance',
    'Manage students',
    'Export data',
    'View analytics',
    'Medical leave management'
  ];

  const studentAccess = [
    'Self-registration',
    'View profile'
  ];

  const accessList = user.role === 'superadmin' ? superadminAccess : 
                     user.role === 'teacher' ? teacherAccess : studentAccess;

  return (
    <div className="user-profile-container">
      <div className="user-profile-layout">
        {/* User Sidebar Card */}
        <div className="user-sidebar-card">
          <div className="user-avatar-section">
            <div className={`user-avatar ${getRoleClass(user.role)}`}>
              {getInitials(user.username)}
            </div>
            <h3 className="user-name">{user.username}</h3>
            <span className={`user-role-badge ${getRoleClass(user.role)}`}>
              <span>{getRoleIcon(user.role)}</span>
              <span>{getRoleLabel(user.role)}</span>
            </span>
          </div>
          
          <div className="user-info-section">
            <div className="user-info-item">
              <span className="user-info-label">User ID</span>
              <span className="user-info-value">{user.id}</span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Status</span>
              <span className={`user-info-value ${user.is_active ? 'active' : 'inactive'}`}>
                {user.is_active ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Role</span>
              <span className="user-info-value">{user.role}</span>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout & Clear Session
          </button>
          <p className="logout-note">This will clear all cookies and refresh the page</p>
        </div>

        {/* Main Content Area */}
        <div className="user-main-content">
          {/* Tab Navigation */}
          <nav className="admin-tabs-nav">
            {visibleTabs.map(tab => (
              <button 
                key={tab.id}
                className={`admin-tab-btn ${activeSection === tab.id ? 'active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Content Panel */}
          <div className="admin-content-panel">
            {activeSection === 'profile' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h3 className="admin-section-title">User Profile</h3>
                </div>
                <div className="profile-info-grid">
                  <div className="info-card">
                    <h4 className="info-card-title">Account Information</h4>
                    <div className="info-grid">
                      <div className="info-row">
                        <span className="info-row-label">Username</span>
                        <span className="info-row-value">{user.username}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label">User ID</span>
                        <span className="info-row-value">{user.id}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label">Role</span>
                        <span className="info-row-value">{getRoleLabel(user.role)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label">Status</span>
                        <span className={`info-row-value ${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="access-card">
                    <h4 className="access-card-title">System Access</h4>
                    <div className="access-list">
                      {accessList.map((item, index) => (
                        <div key={index} className="access-item">
                          <span className="access-icon">✅</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'exports' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h3 className="admin-section-title">Individual Student Exports</h3>
                </div>
                <ExportPanel />
              </div>
            )}

            {activeSection === 'attendance-exports' && (
              <AttendanceExport showMessage={showMessage} />
            )}

            {activeSection === 'medical' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h3 className="admin-section-title">Medical Leave Management</h3>
                </div>
                <MedicalLeave showMessage={showMessage} />
              </div>
            )}

            {activeSection === 'self-register' && user.role === 'student' && (
              <RequireAuth roles={['student']}>
                <StudentSelfRegister showMessage={showMessage} />
              </RequireAuth>
            )}

            {activeSection === 'register' && ['superadmin', 'teacher'].includes(user.role) && (
              <RequireAuth roles={['superadmin', 'teacher']}>
                <RegisterStudentAdmin showMessage={showMessage} />
              </RequireAuth>
            )}

            {activeSection === 'classes' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
                <ClassManagement showMessage={showMessage} />
              </RequireAuth>
            )}

            {activeSection === 'subjects' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
                <SubjectManagement showMessage={showMessage} />
              </RequireAuth>
            )}

            {activeSection === 'admin' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
                <AdminUsers />
              </RequireAuth>
            )}

            {activeSection === 'backup' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
                <div className="admin-section">
                  <div className="admin-section-header">
                    <h3 className="admin-section-title">System Backup</h3>
                  </div>
                  <BackupManager showMessage={showMessage} />
                </div>
              </RequireAuth>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
