import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function TeacherList({ onRefresh }) {
  const { token, user: currentUser } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teachers');
      }

      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [token]);

  useEffect(() => {
    if (onRefresh) {
      fetchTeachers();
    }
  }, [onRefresh]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin':
        return '👑';
      case 'teacher':
        return '👨‍🏫';
      default:
        return '👤';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin':
        return '#e74c3c';
      case 'teacher':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#27ae60' : '#e74c3c';
  };

  const getStatusIcon = (isActive) => {
    return isActive ? '✅' : '❌';
  };

  const handleRoleChange = async (userId, newRole, username) => {
    if (updatingRole === userId) return; // Prevent double clicks
    
    const roleDisplay = newRole === 'superadmin' ? 'Super Admin' : 'Teacher';
    
    if (!window.confirm(`Are you sure you want to change this user's role to ${roleDisplay}?`)) {
      return;
    }

    try {
      setUpdatingRole(userId);
      const response = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update role');
      }

      // Refresh the list
      await fetchTeachers();
      
      // Show success message with instruction
      alert(
        `✅ Success!\n\n` +
        `${username}'s role has been changed to ${roleDisplay}.\n\n` +
        `⚠️ IMPORTANT:\n` +
        `${username} must LOG OUT and LOG BACK IN for the changes to take effect.\n\n` +
        `Until they log back in, they will still see their old permissions.`
      );
      
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handlePasswordReset = async (userId, username, isPrimaryAdmin) => {
    if (resettingPassword === userId) return; // Prevent double clicks
    
    // Prevent resetting primary admin's password (unless you are the primary admin)
    if (isPrimaryAdmin && currentUser.username !== username) {
      alert(`🔒 Cannot reset password for primary admin '${username}'.\nOnly they can change their own password.`);
      return;
    }
    
    const newPassword = window.prompt(
      `Reset password for ${username}:\n\n` +
      `Enter new password (minimum 6 characters):`
    );
    
    if (!newPassword) {
      return; // User cancelled
    }
    
    if (newPassword.length < 6) {
      alert('❌ Password must be at least 6 characters long!');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to reset ${username}'s password?`)) {
      return;
    }

    try {
      setResettingPassword(userId);
      const response = await fetch(`${API_BASE}/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to reset password');
      }

      alert(
        `✅ Password Reset Successful!\n\n` +
        `${username}'s password has been changed.\n\n` +
        `They can now log in with their new password.`
      );
      
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: '#7f8c8d'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(127, 140, 141, 0.3)',
            borderTop: '2px solid #7f8c8d',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading teachers...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        border: '1px solid rgba(231, 76, 60, 0.2)',
        borderRadius: '12px',
        color: '#e74c3c',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span>⚠️</span>
          <strong>Error loading teachers</strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
        <button
          onClick={fetchTeachers}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  const teacherCount = teachers.filter(t => t.role === 'teacher').length;
  const superadminCount = teachers.filter(t => t.role === 'superadmin').length;
  const activeCount = teachers.filter(t => t.is_active).length;

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      {/* Info Banner */}
      <div style={{
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        border: '1px solid rgba(52, 152, 219, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'start',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <div style={{ fontSize: '0.85rem', color: '#2980b9' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <strong>Note:</strong> When you change a user's role, they must <strong>log out and log back in</strong> for changes to take effect.
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            🔒 <strong>Primary admin accounts (Protected)</strong> cannot have their role or password changed by others.
          </div>
        </div>
      </div>

      {/* Header with Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(44, 62, 80, 0.1)'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            color: '#2c3e50',
            fontSize: '1.3rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            👥 Current Users
          </h3>
          <p style={{
            margin: '0.25rem 0 0 0',
            color: '#7f8c8d',
            fontSize: '0.9rem'
          }}>
            Manage system users and their roles
          </p>
        </div>
        <button
          onClick={fetchTeachers}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#2980b9';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#3498db';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          border: '1px solid rgba(52, 152, 219, 0.2)',
          borderRadius: '10px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👨‍🏫</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3498db' }}>{teacherCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Teachers</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          border: '1px solid rgba(231, 76, 60, 0.2)',
          borderRadius: '10px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👑</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#e74c3c' }}>{superadminCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Admins</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          border: '1px solid rgba(39, 174, 96, 0.2)',
          borderRadius: '10px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#27ae60' }}>{activeCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Active</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(44, 62, 80, 0.1)',
          border: '1px solid rgba(44, 62, 80, 0.2)',
          borderRadius: '10px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2c3e50' }}>{teachers.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Total</div>
        </div>
      </div>

      {/* Teachers List */}
      {teachers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#7f8c8d'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>No users found</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Create your first user to get started</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '0.75rem'
        }}>
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(44, 62, 80, 0.1)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                e.target.style.borderColor = 'rgba(44, 62, 80, 0.2)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.target.style.borderColor = 'rgba(44, 62, 80, 0.1)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: getRoleColor(teacher.role),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {teacher.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '0.25rem'
                  }}>
                    {teacher.username}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#7f8c8d'
                  }}>
                    ID: {teacher.id}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Role Section - Show dropdown OR static badge */}
                {currentUser && teacher.id !== currentUser.id && !teacher.is_primary_admin ? (
                  // Editable role dropdown (for non-primary admins, not yourself)
                  <select
                    value={teacher.role}
                    onChange={(e) => handleRoleChange(teacher.id, e.target.value, teacher.username)}
                    disabled={updatingRole === teacher.id}
                    style={{
                      padding: '0.4rem 0.6rem',
                      backgroundColor: updatingRole === teacher.id ? '#ecf0f1' : 'white',
                      border: `1px solid ${getRoleColor(teacher.role)}40`,
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      color: getRoleColor(teacher.role),
                      cursor: updatingRole === teacher.id ? 'not-allowed' : 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (updatingRole !== teacher.id) {
                        e.target.style.borderColor = getRoleColor(teacher.role);
                        e.target.style.boxShadow = `0 0 0 2px ${getRoleColor(teacher.role)}20`;
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = `${getRoleColor(teacher.role)}40`;
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="teacher">👨‍🏫 Teacher</option>
                    <option value="superadmin">👑 Super Admin</option>
                  </select>
                ) : (
                  // Static role badge (for yourself or primary admin)
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: teacher.is_primary_admin ? '#ffd700' : `${getRoleColor(teacher.role)}20`,
                    border: teacher.is_primary_admin ? '2px solid #ffa500' : `1px solid ${getRoleColor(teacher.role)}40`,
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: teacher.is_primary_admin ? '#000' : getRoleColor(teacher.role)
                  }}>
                    <span>{teacher.is_primary_admin ? '🔒' : getRoleIcon(teacher.role)}</span>
                    {teacher.role === 'superadmin' ? 'Super Admin' : 'Teacher'}
                    {teacher.is_primary_admin && (
                      <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>(Protected)</span>
                    )}
                    {currentUser && teacher.id === currentUser.id && !teacher.is_primary_admin && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(You)</span>
                    )}
                  </div>
                )}
                
                {/* Status Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: `${getStatusColor(teacher.is_active)}20`,
                  border: `1px solid ${getStatusColor(teacher.is_active)}40`,
                  borderRadius: '15px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: getStatusColor(teacher.is_active)
                }}>
                  <span>{getStatusIcon(teacher.is_active)}</span>
                  {teacher.is_active ? 'Active' : 'Inactive'}
                </div>

                {/* Password Reset Button - Show for all users */}
                <button
                  onClick={() => handlePasswordReset(teacher.id, teacher.username, teacher.is_primary_admin)}
                  disabled={resettingPassword === teacher.id}
                  style={{
                    padding: '0.4rem 0.75rem',
                    backgroundColor: resettingPassword === teacher.id ? '#ecf0f1' : '#9b59b6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: resettingPassword === teacher.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (resettingPassword !== teacher.id) {
                      e.currentTarget.style.backgroundColor = '#8e44ad';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (resettingPassword !== teacher.id) {
                      e.currentTarget.style.backgroundColor = '#9b59b6';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  title={teacher.is_primary_admin && currentUser.username !== teacher.username 
                    ? "Primary admin password is protected" 
                    : "Reset user password"}
                >
                  <span>🔑</span>
                  {resettingPassword === teacher.id ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
