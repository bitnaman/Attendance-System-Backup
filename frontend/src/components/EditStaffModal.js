import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import '../styles/user-profile.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * Comprehensive staff editing modal with tabs for:
 * - Profile Details (username, role, status)
 * - Profile Photo
 * - Password Reset
 * - Delete User
 */
export default function EditStaffModal({ 
  isOpen, 
  onClose, 
  user, 
  onUserUpdated,
  currentUser
}) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Form states
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteStep, setDeleteStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  
  const fileInputRef = useRef(null);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setRole(user.role || 'teacher');
      setIsActive(user.is_active !== false);
      setNewPassword('');
      setConfirmPassword('');
      setDeleteReason('');
      setDeleteStep(1);
      setPhotoPreview(null);
      setPhotoFile(null);
      setMessage({ text: '', type: '' });
      setActiveTab('details');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const isOwnAccount = currentUser && currentUser.id === user.id;
  const isPrimaryAdmin = user.is_primary_admin;
  const canModify = !isPrimaryAdmin || isOwnAccount;
  const canDelete = currentUser?.role === 'superadmin' && !isOwnAccount && !isPrimaryAdmin;
  const canChangeRole = currentUser?.role === 'superadmin' && !isOwnAccount && !isPrimaryAdmin;

  // =====================
  // PROFILE DETAILS
  // =====================
  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!canModify) {
      showMessage('Cannot modify this protected account', 'error');
      return;
    }

    if (username.length < 3) {
      showMessage('Username must be at least 3 characters', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Update username/active status
      const detailsResponse = await fetch(`${API_BASE}/auth/users/${user.id}/details`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username !== user.username ? username : undefined,
          is_active: isActive !== user.is_active ? isActive : undefined
        }),
      });

      if (!detailsResponse.ok) {
        const error = await detailsResponse.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update details');
      }

      // Update role if changed and allowed
      if (canChangeRole && role !== user.role) {
        const roleResponse = await fetch(`${API_BASE}/auth/users/${user.id}/role`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role }),
        });

        if (!roleResponse.ok) {
          const error = await roleResponse.json().catch(() => ({}));
          throw new Error(error.detail || 'Failed to update role');
        }
      }

      showMessage('✅ Profile updated successfully!', 'success');
      onUserUpdated?.();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // PROFILE PHOTO
  // =====================
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showMessage('Image must be less than 5MB', 'error');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      showMessage('Please select a photo first', 'error');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await fetch(`${API_BASE}/auth/users/${user.id}/photo`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to upload photo');
      }

      showMessage('✅ Photo updated successfully!', 'success');
      setPhotoFile(null);
      setPhotoPreview(null);
      onUserUpdated?.();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // PASSWORD RESET
  // =====================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (isPrimaryAdmin && !isOwnAccount) {
      showMessage('Only the primary admin can change their own password', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/auth/users/${user.id}/password`, {
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

      showMessage('✅ Password reset successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // DELETE USER
  // =====================
  const handleDeleteUser = async () => {
    if (!canDelete) {
      showMessage('You cannot delete this user', 'error');
      return;
    }

    if (deleteReason.trim().length < 5) {
      showMessage('Please provide a reason (at least 5 characters)', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/auth/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to delete user');
      }

      showMessage('✅ User marked for deletion', 'success');
      onUserUpdated?.();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('details');
    setDeleteStep(1);
    setMessage({ text: '', type: '' });
    onClose();
  };

  const getRoleIcon = (r) => {
    return r === 'superadmin' ? '👑' : r === 'teacher' ? '👨‍🏫' : '🎓';
  };

  const getPhotoUrl = () => {
    if (photoPreview) return photoPreview;
    if (user.profile_photo) {
      return user.profile_photo.startsWith('http') 
        ? user.profile_photo 
        : `${API_BASE}${user.profile_photo}`;
    }
    return null;
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="edit-staff-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="edit-modal-user-info">
            <div className="edit-modal-avatar">
              {getPhotoUrl() ? (
                <img src={getPhotoUrl()} alt={user.username} />
              ) : (
                <span>{user.username?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3>Edit Staff: {user.username}</h3>
              <span className="edit-modal-role">
                {getRoleIcon(user.role)} {user.role === 'superadmin' ? 'Administrator' : 'Teacher'}
                {isPrimaryAdmin && ' 🔒'}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`edit-modal-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="edit-modal-tabs">
          <button 
            className={`edit-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📝 Details
          </button>
          <button 
            className={`edit-modal-tab ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            📷 Photo
          </button>
          <button 
            className={`edit-modal-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
            disabled={isPrimaryAdmin && !isOwnAccount}
            title={isPrimaryAdmin && !isOwnAccount ? 'Protected account' : ''}
          >
            🔑 Password
          </button>
          {canDelete && (
            <button 
              className={`edit-modal-tab danger ${activeTab === 'delete' ? 'active' : ''}`}
              onClick={() => setActiveTab('delete')}
            >
              🗑️ Delete
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="edit-modal-content">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateDetails} className="edit-modal-form">
              <div className="form-group">
                <label>👤 Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={!canModify || loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>🎭 Role</label>
                {canChangeRole ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    className="form-select"
                  >
                    <option value="teacher">👨‍🏫 Teacher</option>
                    <option value="superadmin">👑 Administrator</option>
                  </select>
                ) : (
                  <div className="form-static">
                    {getRoleIcon(role)} {role === 'superadmin' ? 'Administrator' : 'Teacher'}
                    {isOwnAccount && <span className="form-note"> (Cannot change own role)</span>}
                    {isPrimaryAdmin && <span className="form-note"> (Protected)</span>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>📊 Status</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setIsActive(true)}
                    disabled={!canModify || loading}
                  >
                    ✅ Active
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${!isActive ? 'active inactive' : ''}`}
                    onClick={() => setIsActive(false)}
                    disabled={!canModify || isPrimaryAdmin || loading}
                  >
                    ❌ Inactive
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={!canModify || loading}
                >
                  {loading ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* PHOTO TAB */}
          {activeTab === 'photo' && (
            <div className="edit-modal-form">
              <div className="photo-upload-area">
                <div className="photo-preview-large">
                  {getPhotoUrl() ? (
                    <img src={getPhotoUrl()} alt={user.username} />
                  ) : (
                    <div className="photo-placeholder">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                <div className="photo-actions">
                  <button 
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    📁 Choose Photo
                  </button>
                  {photoFile && (
                    <button 
                      type="button"
                      className="btn-primary"
                      onClick={handleUploadPhoto}
                      disabled={loading}
                    >
                      {loading ? '⏳ Uploading...' : '⬆️ Upload Photo'}
                    </button>
                  )}
                </div>
                
                {photoFile && (
                  <p className="photo-info">
                    Selected: {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handleResetPassword} className="edit-modal-form">
              {isPrimaryAdmin && !isOwnAccount ? (
                <div className="protected-notice">
                  🔒 This is the primary admin account. Only they can change their own password.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>🔑 New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      disabled={loading}
                      className="form-input"
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label>🔑 Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={loading}
                      className="form-input"
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={handleClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={loading || !newPassword || !confirmPassword}
                    >
                      {loading ? '⏳ Resetting...' : '🔄 Reset Password'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* DELETE TAB */}
          {activeTab === 'delete' && canDelete && (
            <div className="edit-modal-form delete-section">
              {deleteStep === 1 ? (
                <>
                  <div className="delete-warning">
                    <span className="warning-icon">⚠️</span>
                    <p>You are about to delete <strong>{user.username}</strong>.</p>
                    <p>The user will be marked for deletion and permanently removed after 45 days.</p>
                  </div>

                  <div className="form-group">
                    <label>📝 Reason for Deletion *</label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Please provide a reason for deletion (required)..."
                      disabled={loading}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={handleClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-danger"
                      onClick={() => {
                        if (deleteReason.trim().length < 5) {
                          showMessage('Please provide a reason (at least 5 characters)', 'error');
                          return;
                        }
                        setDeleteStep(2);
                      }}
                      disabled={loading || deleteReason.trim().length < 5}
                    >
                      Continue →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="delete-confirm-warning">
                    <span className="warning-icon">🚨</span>
                    <p><strong>Final Confirmation</strong></p>
                    <p>Are you absolutely sure you want to delete <strong>{user.username}</strong>?</p>
                    <p className="delete-reason-display">
                      Reason: "{deleteReason}"
                    </p>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setDeleteStep(1)}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                    <button 
                      type="button" 
                      className="btn-danger"
                      onClick={handleDeleteUser}
                      disabled={loading}
                    >
                      {loading ? '⏳ Deleting...' : '🗑️ Confirm Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
