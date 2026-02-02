import React, { useState } from 'react';
import '../styles/user-profile.css';

/**
 * Two-step confirmation modal for deleting users.
 * Requires a reason and double confirmation before deletion.
 */
export default function DeleteUserModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  user, 
  isDeleting 
}) {
  const [step, setStep] = useState(1); // Step 1: Enter reason, Step 2: Confirm
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleNext = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm(user.id, reason.trim());
  };

  const handleClose = () => {
    setStep(1);
    setReason('');
    setError('');
    onClose();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="delete-user-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="delete-modal-header">
          <div className="delete-modal-icon">⚠️</div>
          <h3>{step === 1 ? 'Remove User' : 'Confirm Removal'}</h3>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        {/* User Info */}
        <div className="delete-user-info">
          <div className="delete-user-avatar">
            {user.profile_photo ? (
              <img 
                src={user.profile_photo.startsWith('http') ? user.profile_photo : `${process.env.REACT_APP_API_BASE || 'http://localhost:8000'}${user.profile_photo}`}
                alt={user.username}
              />
            ) : (
              <span>{user.username?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="delete-user-details">
            <div className="delete-user-name">{user.username}</div>
            <div className="delete-user-role">
              {getRoleIcon(user.role)} {user.role === 'superadmin' ? 'Administrator' : user.role === 'teacher' ? 'Teacher' : 'Student'}
            </div>
          </div>
        </div>

        {/* Step 1: Enter Reason */}
        {step === 1 && (
          <div className="delete-modal-content">
            <div className="delete-warning-box">
              <span className="warning-icon">ℹ️</span>
              <div>
                <strong>This action will:</strong>
                <ul>
                  <li>Prevent this user from logging in</li>
                  <li>Mark the account as removed</li>
                  <li>Keep the record for 45 days before permanent deletion</li>
                </ul>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">📝 Reason for Removal *</label>
              <textarea
                className={`form-input ${error ? 'error' : ''}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for removing this user (e.g., Left organization, Contract ended, etc.)"
                rows={3}
              />
              {error && <div className="form-error"><span>⚠️</span> {error}</div>}
            </div>

            <div className="delete-modal-actions">
              <button className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button className="btn-warning" onClick={handleNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="delete-modal-content">
            <div className="delete-confirm-box">
              <span className="confirm-icon">🗑️</span>
              <div>
                <strong>Are you absolutely sure?</strong>
                <p>You are about to remove <strong>{user.username}</strong> from the system.</p>
                <div className="reason-preview">
                  <strong>Reason:</strong> {reason}
                </div>
              </div>
            </div>

            <div className="delete-modal-actions">
              <button className="btn-secondary" onClick={() => setStep(1)} disabled={isDeleting}>
                ← Back
              </button>
              <button 
                className="btn-danger" 
                onClick={handleConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Removing...
                  </>
                ) : (
                  '🗑️ Confirm Removal'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
