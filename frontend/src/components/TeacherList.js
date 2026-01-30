import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import '../styles/user-profile.css';

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

      if (!response.ok) throw new Error('Failed to fetch teachers');
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, [token]);
  useEffect(() => { if (onRefresh) fetchTeachers(); }, [onRefresh]);

  const getRoleColor = (role) => {
    return role === 'superadmin' ? '#e74c3c' : role === 'teacher' ? '#3498db' : '#95a5a6';
  };

  const handleRoleChange = async (userId, newRole, username) => {
    if (updatingRole === userId) return;
    
    const roleDisplay = newRole === 'superadmin' ? 'Super Admin' : 'Teacher';
    if (!window.confirm(`Change ${username}'s role to ${roleDisplay}?`)) return;

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

      await fetchTeachers();
      alert(`✅ ${username}'s role changed to ${roleDisplay}.\n\n⚠️ They must LOG OUT and LOG BACK IN for changes to take effect.`);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handlePasswordReset = async (userId, username, isPrimaryAdmin) => {
    if (resettingPassword === userId) return;
    
    if (isPrimaryAdmin && currentUser.username !== username) {
      alert(`🔒 Cannot reset password for primary admin '${username}'.`);
      return;
    }
    
    const newPassword = window.prompt(`Reset password for ${username}:\n\nEnter new password (min 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('❌ Password must be at least 6 characters!');
      return;
    }
    if (!window.confirm(`Reset ${username}'s password?`)) return;

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

      alert(`✅ ${username}'s password has been reset.`);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading) {
    return (
      <div className="user-list-card">
        <div className="loading-spinner">
          <div className="spinner" />
          Loading users...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-list-card">
        <div className="form-message error">
          <span>⚠️</span>
          <span>Error: {error}</span>
        </div>
        <button className="refresh-btn" onClick={fetchTeachers} style={{ marginTop: '1rem' }}>
          🔄 Retry
        </button>
      </div>
    );
  }

  const teacherCount = teachers.filter(t => t.role === 'teacher').length;
  const superadminCount = teachers.filter(t => t.role === 'superadmin').length;
  const activeCount = teachers.filter(t => t.is_active).length;

  return (
    <div className="user-list-card">
      {/* Info Banner */}
      <div className="info-banner">
        <span className="info-banner-icon">ℹ️</span>
        <div className="info-banner-content">
          <strong>Note:</strong> Role changes require logout/login to take effect.
          <br />
          <span style={{ opacity: 0.85 }}>🔒 Primary admin accounts are protected.</span>
        </div>
      </div>

      {/* Header */}
      <div className="user-list-header">
        <div>
          <h3>👥 Current Users</h3>
          <p>Manage system users and roles</p>
        </div>
        <button className="refresh-btn" onClick={fetchTeachers}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-item teachers">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-value">{teacherCount}</div>
          <div className="stat-label">Teachers</div>
        </div>
        <div className="stat-item admins">
          <div className="stat-icon">👑</div>
          <div className="stat-value">{superadminCount}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-item active">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-item total">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{teachers.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      {/* User List */}
      {teachers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p className="empty-title">No users found</p>
          <p className="empty-desc">Create your first user to get started</p>
        </div>
      ) : (
        <div className="user-list">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="user-list-item">
              <div className="user-item-info">
                <div 
                  className="user-item-avatar" 
                  style={{ backgroundColor: getRoleColor(teacher.role) }}
                >
                  {teacher.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-item-details">
                  <div className="user-item-name">{teacher.username}</div>
                  <div className="user-item-id">ID: {teacher.id}</div>
                </div>
              </div>
              
              <div className="user-item-actions">
                {/* Role Control */}
                {currentUser && teacher.id !== currentUser.id && !teacher.is_primary_admin ? (
                  <select
                    className="role-select"
                    value={teacher.role}
                    onChange={(e) => handleRoleChange(teacher.id, e.target.value, teacher.username)}
                    disabled={updatingRole === teacher.id}
                    style={{ 
                      borderColor: `${getRoleColor(teacher.role)}60`,
                      color: getRoleColor(teacher.role)
                    }}
                  >
                    <option value="teacher">👨‍🏫 Teacher</option>
                    <option value="superadmin">👑 Admin</option>
                  </select>
                ) : (
                  <span className={`role-badge ${teacher.is_primary_admin ? 'protected' : ''}`}>
                    {teacher.is_primary_admin ? '🔒' : (teacher.role === 'superadmin' ? '👑' : '👨‍🏫')}
                    {teacher.role === 'superadmin' ? ' Admin' : ' Teacher'}
                    {teacher.is_primary_admin && <span style={{ fontSize: '0.65rem' }}> (Protected)</span>}
                    {currentUser && teacher.id === currentUser.id && !teacher.is_primary_admin && 
                      <span style={{ opacity: 0.7 }}> (You)</span>}
                  </span>
                )}
                
                {/* Status */}
                <span className={`status-badge ${teacher.is_active ? 'active' : 'inactive'}`}>
                  {teacher.is_active ? '✅ Active' : '❌ Inactive'}
                </span>

                {/* Password Reset */}
                <button
                  className="action-btn password"
                  onClick={() => handlePasswordReset(teacher.id, teacher.username, teacher.is_primary_admin)}
                  disabled={resettingPassword === teacher.id}
                  title={teacher.is_primary_admin && currentUser.username !== teacher.username 
                    ? "Primary admin password is protected" 
                    : "Reset password"}
                >
                  🔑 {resettingPassword === teacher.id ? '...' : 'Reset'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
