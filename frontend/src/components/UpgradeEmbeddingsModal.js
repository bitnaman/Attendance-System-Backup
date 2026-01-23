import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/upgrade-modal.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

/**
 * Modal to upgrade a student's face embedding using current .env settings
 * Allows choosing between using existing photo or uploading a new one
 */
const UpgradeEmbeddingsModal = ({ 
  isOpen, 
  onClose, 
  student, 
  onSuccess,
  onError 
}) => {
  // ALL hooks must be called unconditionally at the top
  const [step, setStep] = useState('choose');
  const [useExisting, setUseExisting] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Early return AFTER all hooks
  if (!isOpen || !student) return null;

  // Reset state helper
  const resetState = () => {
    setStep('choose');
    setUseExisting(true);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setIsUpgrading(false);
    setStatusMessage('');
    setProgress(0);
  };

  // Handle modal close
  const handleClose = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    resetState();
    onClose();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

  // Remove a selected file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle the upgrade process
  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setStep('processing');
    setProgress(10);
    setStatusMessage('Preparing to upgrade embedding...');

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('use_existing_photos', useExisting ? 'true' : 'false');
      
      if (!useExisting && selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('photos', file);
        });
        setStatusMessage(`Uploading ${selectedFiles.length} photo(s)...`);
        setProgress(20);
      }

      setStatusMessage('Generating new face embedding with current AI settings...');
      setProgress(40);
      
      const response = await fetch(
        `${API_BASE}/student/${student.id}/upgrade-embeddings`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upgrade embedding');
      }

      const result = await response.json();
      
      setProgress(100);
      setStep('complete');
      setStatusMessage(`✅ ${result.message || 'Embedding upgraded successfully!'}`);
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.message || 'Embedding upgraded successfully');
        }
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Upgrade error:', error);
      setStatusMessage(`❌ Error: ${error.message}`);
      if (onError) {
        onError(error.message);
      }
      setIsUpgrading(false);
      setStep('choose');
    }
  };

  // Handle "Next" button
  const handleNext = () => {
    if (step === 'choose') {
      if (useExisting) {
        handleUpgrade();
      } else {
        setStep('upload');
      }
    } else if (step === 'upload') {
      if (selectedFiles.length === 0) {
        setStatusMessage('⚠️ Please select at least one photo');
        return;
      }
      handleUpgrade();
    }
  };

  // Handle "Back" button
  const handleBack = () => {
    if (step === 'upload') {
      setStep('choose');
      setStatusMessage('');
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'choose':
        return (
          <div className="upgrade-step choose-step">
            <div className="student-info">
              <div className="student-photo">
                {student.photo_url ? (
                  <img 
                    src={student.photo_url.startsWith('http') ? student.photo_url : `${API_BASE}${student.photo_url}`} 
                    alt={student.name}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="no-photo">No Photo</div>
                )}
              </div>
              <div className="student-details">
                <h3>{student.name}</h3>
                <p><strong>Roll No:</strong> {student.roll_no}</p>
                <p><strong>Class:</strong> {student.class_name || 'N/A'}</p>
              </div>
            </div>

            <div className="choice-section">
              <h4>Choose how to upgrade:</h4>
              
              <label className={`choice-option ${useExisting ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="photoChoice" 
                  checked={useExisting}
                  onChange={() => setUseExisting(true)}
                />
                <div className="choice-content">
                  <span className="choice-icon">📷</span>
                  <div className="choice-text">
                    <strong>Use Existing Photo</strong>
                    <p>Re-generate embedding from current photo using the latest AI model settings</p>
                  </div>
                </div>
              </label>

              <label className={`choice-option ${!useExisting ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="photoChoice" 
                  checked={!useExisting}
                  onChange={() => setUseExisting(false)}
                />
                <div className="choice-content">
                  <span className="choice-icon">📤</span>
                  <div className="choice-text">
                    <strong>Upload New Photo</strong>
                    <p>Replace current photo with a new one and generate fresh embedding</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="info-note">
              💡 The embedding will be generated using the model and detector settings from your <code>.env</code> configuration.
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="upgrade-step upload-step">
            <h4>Upload New Photo(s) for {student.name}</h4>
            
            <div 
              className="drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              <div className="drop-zone-content">
                <span className="drop-icon">📷</span>
                <p>Click to select photos or drag & drop</p>
                <span className="drop-hint">Supports: JPG, PNG, BMP</span>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="preview-section">
                <h5>Selected Photos ({previewUrls.length})</h5>
                <div className="preview-grid">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="preview-item">
                      <img src={url} alt={`Preview ${index + 1}`} />
                      <button 
                        className="remove-btn"
                        onClick={() => removeFile(index)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="info-note">
              💡 For best results, use clear frontal photos with good lighting.
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="upgrade-step processing-step">
            <div className="processing-animation">
              <div className="spinner"></div>
            </div>
            <h4>Upgrading Embedding...</h4>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="status-text">{statusMessage}</p>
          </div>
        );

      case 'complete':
        return (
          <div className="upgrade-step complete-step">
            <div className="success-icon">✅</div>
            <h4>Embedding Upgraded Successfully!</h4>
            <p>{statusMessage}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="upgrade-modal-overlay" onClick={handleClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-modal-header">
          <h2>🔄 Upgrade AI Embedding</h2>
          <button 
            className="close-btn" 
            onClick={handleClose} 
            disabled={isUpgrading}
          >
            ×
          </button>
        </div>
        
        <div className="upgrade-modal-content">
          {statusMessage && step !== 'processing' && step !== 'complete' && (
            <div className={`status-message ${statusMessage.includes('❌') ? 'error' : statusMessage.includes('✅') ? 'success' : 'warning'}`}>
              {statusMessage}
            </div>
          )}
          
          {renderStepContent()}
        </div>

        <div className="upgrade-modal-footer">
          {step === 'upload' && (
            <button 
              className="back-btn" 
              onClick={handleBack}
              disabled={isUpgrading}
            >
              ← Back
            </button>
          )}
          
          {(step === 'choose' || step === 'upload') && (
            <>
              <button 
                className="cancel-btn" 
                onClick={handleClose}
                disabled={isUpgrading}
              >
                Cancel
              </button>
              <button 
                className="upgrade-btn" 
                onClick={handleNext}
                disabled={isUpgrading || (step === 'upload' && selectedFiles.length === 0)}
              >
                {step === 'choose' 
                  ? (useExisting ? '🚀 Upgrade Now' : 'Next →')
                  : '🚀 Upgrade with New Photos'
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

UpgradeEmbeddingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  student: PropTypes.object,
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default UpgradeEmbeddingsModal;
