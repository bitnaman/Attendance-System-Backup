import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import EditStaffModal from './EditStaffModal';
import '../styles/user-profile.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function TeacherList({ onRefresh }) {
  const { token, user: currentUser } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [restoringUser, setRestoringUser] = useState(null);

  const fetchTeachers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
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
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch teachers');
      }
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { if (onRefresh) fetchTeachers(); }, [onRefresh, fetchTeachers]);

  const getRoleColor = (role) => {
    return role === 'superadmin' ? '#e74c3c' : role === 'teacher' ? '#3498db' : '#95a5a6';
  };

  const openEditModal = (teacher) => {
    setUserToEdit(teacher);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setUserToEdit(null);
  };

  const handleUserUpdated = () => {
    fetchTeachers();
  };

  const handleRestoreUser = async (userId, username) => {
    if (restoringUser === userId) return;
    
    if (!window.confirm(`Restore user "${username}"?\n\nThis will reactivate their account and allow them to log in again.`)) return;

    try {
      setRestoringUser(userId);
      const response = await fetch(`${API_BASE}/auth/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to restore user');
      }

      await fetchTeachers();
      alert(`✅ ${username} has been restored successfully.`);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setRestoringUser(null);
    }
  };

  const formatDeletionDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
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

  const teacherCount = teachers.filter(t => t.role === 'teacher' && !t.is_deleted).length;
  const superadminCount = teachers.filter(t => t.role === 'superadmin' && !t.is_deleted).length;
  const activeCount = teachers.filter(t => t.is_active && !t.is_deleted).length;
  const deletedCount = teachers.filter(t => t.is_deleted).length;

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
        {deletedCount > 0 && (
          <div className="stat-item" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fca5a5' }}>
            <div className="stat-icon">🗑️</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{deletedCount}</div>
            <div className="stat-label" style={{ color: '#991b1b' }}>Deleted</div>
          </div>
        )}
        <div className="stat-item total">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{teachers.filter(t => !t.is_deleted).length}</div>
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
          {/* Active users first, then deleted users */}
          {[...teachers].sort((a, b) => (a.is_deleted === b.is_deleted ? 0 : a.is_deleted ? 1 : -1)).map((teacher) => (
            <div key={teacher.id} className={`user-list-item ${teacher.is_deleted ? 'deleted' : ''}`}>
              <div className="user-item-info">
                <div 
                  className="user-item-avatar" 
                  style={{ backgroundColor: teacher.profile_photo ? 'transparent' : getRoleColor(teacher.role) }}
                >
                  {teacher.profile_photo ? (
                    <img 
                      src={teacher.profile_photo.startsWith('http') ? teacher.profile_photo : `${API_BASE}${teacher.profile_photo}`} 
                      alt={teacher.username}
                      className="user-item-avatar-img"
                      onError={(e) => {
                        // Safely hide image and show fallback
                        const img = e.currentTarget;
                        if (img) {
                          img.style.display = 'none';
                          // Create a fallback text node instead of modifying parent directly
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector('.fallback-initial')) {
                            const fallback = document.createElement('span');
                            fallback.className = 'fallback-initial';
                            fallback.textContent = teacher.username.charAt(0).toUpperCase();
                            parent.appendChild(fallback);
                            parent.style.backgroundColor = getRoleColor(teacher.role);
                          }
                        }
                      }}
                    />
                  ) : (
                    teacher.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="user-item-details">
                  <div className="user-item-name">
                    {teacher.username}
                    {teacher.is_deleted && (
                      <span className="deleted-badge" style={{ marginLeft: '0.5rem' }}>
                        🗑️ Deleted
                      </span>
                    )}
                  </div>
                  <div className="user-item-id">ID: {teacher.id}</div>
                  {teacher.is_deleted && teacher.deleted_at && (
                    <div className="deletion-info">
                      <div>📅 Deleted on: {formatDeletionDate(teacher.deleted_at)}</div>
                      {teacher.deletion_reason && (
                        <div className="deletion-reason">💬 Reason: "{teacher.deletion_reason}"</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="user-item-actions">
                {/* Show different actions based on deleted status */}
                {teacher.is_deleted ? (
                  /* Deleted User Actions */
                  <button
                    className="restore-btn"
                    onClick={() => handleRestoreUser(teacher.id, teacher.username)}
                    disabled={restoringUser === teacher.id}
                    title="Restore this user"
                  >
                    ♻️ {restoringUser === teacher.id ? 'Restoring...' : 'Restore'}
                  </button>
                ) : (
                  /* Active User Actions */
                  <>
                    {/* Role Badge */}
                    <span className={`role-badge ${teacher.is_primary_admin ? 'protected' : ''}`}>
                      {teacher.is_primary_admin ? '🔒' : (teacher.role === 'superadmin' ? '👑' : '👨‍🏫')}
                      {teacher.role === 'superadmin' ? ' Admin' : ' Teacher'}
                      {teacher.is_primary_admin && <span style={{ fontSize: '0.65rem' }}> (Protected)</span>}
                      {currentUser && teacher.id === currentUser.id && !teacher.is_primary_admin && 
                        <span style={{ opacity: 0.7 }}> (You)</span>}
                    </span>
                    
                    {/* Status */}
                    <span className={`status-badge ${teacher.is_active ? 'active' : 'inactive'}`}>
                      {teacher.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>

                    {/* Edit Button - Opens comprehensive edit modal */}
                    <button
                      className="action-btn edit"
                      onClick={() => openEditModal(teacher)}
                      title="Edit user details"
                    >
                      ✏️ Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        user={userToEdit}
        onUserUpdated={handleUserUpdated}
        currentUser={currentUser}
      />
    </div>
  );
}
