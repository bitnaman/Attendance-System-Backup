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

export default function UserProfile({ user, showMessage }) {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'superadmin':
        return { label: 'Super Administrator', icon: '👑', color: '#dc3545' };
      case 'teacher':
        return { label: 'Teacher', icon: '👨‍🏫', color: '#007bff' };
      default:
        return { label: 'User', icon: '👤', color: '#6c757d' };
    }
  };

  const roleInfo = getRoleDisplay(user.role);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {/* User Info Card */}
        <div style={{ 
          flex: '0 0 300px',
          padding: 20, 
          backgroundColor: 'white', 
          borderRadius: 12, 
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              backgroundColor: roleInfo.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 24,
              color: 'white',
              fontWeight: 'bold'
            }}>
              {getInitials(user.username)}
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{user.username}</h3>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '4px 12px',
              backgroundColor: roleInfo.color,
              color: 'white',
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 'bold'
            }}>
              <span>{roleInfo.icon}</span>
              <span>{roleInfo.label}</span>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>User ID:</strong> {user.id}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Status:</strong> 
              <span style={{ 
                color: user.is_active ? '#28a745' : '#dc3545',
                marginLeft: 8
              }}>
                {user.is_active ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            <div>
              <strong>Role:</strong> {user.role}
            </div>
          </div>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to logout? This will clear all session data and refresh the page.')) {
                  logout();
                }
              }}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#c82333';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#dc3545';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
              }}
            >
              🚪 Logout & Clear Session
            </button>
            <div style={{ 
              marginTop: 8, 
              fontSize: 12, 
              color: '#6c757d',
              fontStyle: 'italic'
            }}>
              This will clear all cookies and refresh the page
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 20,
            flexWrap: 'wrap'
          }}>
            <button 
              className={`beautified-tab ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
              style={{ minWidth: 'auto' }}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">Profile</span>
            </button>
            
            <button 
              className={`beautified-tab ${activeSection === 'exports' ? 'active' : ''}`}
              onClick={() => setActiveSection('exports')}
              style={{ minWidth: 'auto' }}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-label">Student Exports</span>
            </button>
            
            <button 
              className={`beautified-tab ${activeSection === 'attendance-exports' ? 'active' : ''}`}
              onClick={() => setActiveSection('attendance-exports')}
              style={{ minWidth: 'auto' }}
            >
              <span className="tab-icon">📈</span>
              <span className="tab-label">Attendance Exports</span>
            </button>
            
            <button 
              className={`beautified-tab ${activeSection === 'medical' ? 'active' : ''}`}
              onClick={() => setActiveSection('medical')}
              style={{ minWidth: 'auto' }}
            >
              <span className="tab-icon">🏥</span>
              <span className="tab-label">Medical Leave</span>
            </button>
            
            {user.role === 'superadmin' && (
              <>
                <button 
                  className={`beautified-tab ${activeSection === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveSection('register')}
                  style={{ minWidth: 'auto' }}
                >
                  <span className="tab-icon">➕</span>
                  <span className="tab-label">Register Student</span>
                </button>
                
                <button 
                  className={`beautified-tab ${activeSection === 'classes' ? 'active' : ''}`}
                  onClick={() => setActiveSection('classes')}
                  style={{ minWidth: 'auto' }}
                >
                  <span className="tab-icon">🏫</span>
                  <span className="tab-label">Manage Classes</span>
                </button>
                
                <button 
                  className={`beautified-tab ${activeSection === 'subjects' ? 'active' : ''}`}
                  onClick={() => setActiveSection('subjects')}
                  style={{ minWidth: 'auto' }}
                >
                  <span className="tab-icon">📚</span>
                  <span className="tab-label">Subjects</span>
                </button>
                
                <button 
                  className={`beautified-tab ${activeSection === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveSection('admin')}
                  style={{ minWidth: 'auto' }}
                >
                  <span className="tab-icon">👑</span>
                  <span className="tab-label">Admin</span>
                </button>
                
                <button 
                  className={`beautified-tab ${activeSection === 'backup' ? 'active' : ''}`}
                  onClick={() => setActiveSection('backup')}
                  style={{ minWidth: 'auto' }}
                >
                  <span className="tab-icon">💾</span>
                  <span className="tab-label">Backup</span>
                </button>
              </>
            )}
          </div>

          {/* Content Area */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: 12, 
            border: '1px solid #e9ecef',
            minHeight: 500
          }}>
            {activeSection === 'profile' && (
              <div style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>User Profile</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ 
                    padding: 16, 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 8,
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>Account Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <strong>Username:</strong> {user.username}
                      </div>
                      <div>
                        <strong>User ID:</strong> {user.id}
                      </div>
                      <div>
                        <strong>Role:</strong> {roleInfo.label}
                      </div>
                      <div>
                        <strong>Status:</strong> 
                        <span style={{ 
                          color: user.is_active ? '#28a745' : '#dc3545',
                          marginLeft: 8
                        }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: 16, 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: 8,
                    border: '1px solid #bbdefb'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>System Access</h4>
                    <div style={{ color: '#1976d2' }}>
                      {user.role === 'superadmin' ? (
                        <div>
                          <p style={{ margin: '0 0 8px 0' }}>✅ Full system access</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ User management</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ System configuration</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ Backup and restore</p>
                          <p style={{ margin: 0 }}>✅ All teacher capabilities</p>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: '0 0 8px 0' }}>✅ Mark attendance</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ Manage students</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ Export data</p>
                          <p style={{ margin: '0 0 8px 0' }}>✅ View analytics</p>
                          <p style={{ margin: 0 }}>✅ Medical leave management</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'exports' && (
              <div style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Individual Student Exports</h3>
                <ExportPanel />
              </div>
            )}

            {activeSection === 'attendance-exports' && (
              <AttendanceExport showMessage={showMessage} />
            )}

            {activeSection === 'medical' && (
              <div style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Medical Leave Management</h3>
                <MedicalLeave showMessage={showMessage} />
              </div>
            )}

            {activeSection === 'register' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
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
                <div style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Administrator Panel</h3>
                  <AdminUsers />
                </div>
              </RequireAuth>
            )}

            {activeSection === 'backup' && user.role === 'superadmin' && (
              <RequireAuth roles={['superadmin']}>
                <div style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>System Backup</h3>
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
