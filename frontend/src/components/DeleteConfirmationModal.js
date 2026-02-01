import React, { useState, useEffect } from 'react';

/**
 * Two-step delete confirmation modal.
 * First confirmation: Shows warning and asks for confirmation
 * Second confirmation: Requires typing student name to confirm
 */
export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  studentName, 
  studentId,
  isDeleting 
}) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep(2);
    setError('');
  };

  const handleSecondConfirm = () => {
    // Verify the typed name matches
    if (confirmText.toLowerCase().trim() !== studentName.toLowerCase().trim()) {
      setError('The name you entered does not match. Please type the exact student name.');
      return;
    }
    onConfirm(studentId, studentName);
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: '30px 35px',
        maxWidth: 450,
        width: '90%',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {step === 1 ? (
          /* Step 1: Initial Warning */
          <>
            <div style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span style={{ fontSize: 35 }}>⚠️</span>
            </div>
            
            <h2 style={{ 
              textAlign: 'center',
              color: '#1f2937', 
              marginBottom: 12,
              fontSize: '1.4rem',
              fontWeight: 600
            }}>
              Delete Student?
            </h2>
            
            <p style={{ 
              textAlign: 'center',
              color: '#6b7280', 
              fontSize: '1rem',
              marginBottom: 8,
              lineHeight: 1.5
            }}>
              You are about to delete:
            </p>
            
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              textAlign: 'center'
            }}>
              <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>{studentName}</strong>
            </div>
            
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24
            }}>
              <p style={{ margin: 0, color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong>⚠️ Warning:</strong> This action will permanently delete:
              </p>
              <ul style={{ margin: '10px 0 0 0', paddingLeft: 20, color: '#9a3412', fontSize: '0.85rem' }}>
                <li>Student's personal information</li>
                <li>Face recognition data</li>
                <li>All attendance records</li>
                <li>Leave records</li>
              </ul>
              <p style={{ margin: '10px 0 0 0', color: '#9a3412', fontSize: '0.85rem', fontWeight: 600 }}>
                This action cannot be undone!
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleClose}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '12px 28px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleFirstConfirm}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Continue to Delete
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Final Confirmation with Name Input */
          <>
            <div style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span style={{ fontSize: 35 }}>🗑️</span>
            </div>
            
            <h2 style={{ 
              textAlign: 'center',
              color: '#dc2626', 
              marginBottom: 12,
              fontSize: '1.4rem',
              fontWeight: 600
            }}>
              Final Confirmation Required
            </h2>
            
            <p style={{ 
              textAlign: 'center',
              color: '#6b7280', 
              fontSize: '0.95rem',
              marginBottom: 20,
              lineHeight: 1.5
            }}>
              To confirm deletion, please type the student's name exactly:
            </p>
            
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <code style={{ 
                color: '#dc2626', 
                fontWeight: 600, 
                fontSize: '1.05rem',
                fontFamily: 'system-ui, sans-serif'
              }}>
                {studentName}
              </code>
            </div>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError('');
              }}
              placeholder="Type student name here..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: error ? '2px solid #dc2626' : '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: '1rem',
                marginBottom: error ? 8 : 20,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              autoFocus
            />
            
            {error && (
              <p style={{ 
                color: '#dc2626', 
                fontSize: '0.85rem', 
                marginBottom: 16,
                textAlign: 'center'
              }}>
                {error}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSecondConfirm}
                disabled={isDeleting || confirmText.trim() === ''}
                style={{
                  backgroundColor: isDeleting ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: isDeleting || confirmText.trim() === '' ? 'not-allowed' : 'pointer',
                  opacity: confirmText.trim() === '' ? 0.6 : 1
                }}
              >
                {isDeleting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      width: 14, 
                      height: 14, 
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block'
                    }}></span>
                    Deleting...
                  </span>
                ) : (
                  '🗑️ Permanently Delete'
                )}
              </button>
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
