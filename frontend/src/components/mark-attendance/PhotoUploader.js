import React, { useCallback, useState } from 'react';

/**
 * PhotoUploader Component
 * Handles single photo upload with drag & drop support
 */
export default function PhotoUploader({ 
  previewImage, 
  onFileChange, 
  onClearImage,
  required = true 
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // Create a synthetic event-like object
      onFileChange({ target: { files: [file] } });
    }
  }, [onFileChange]);

  return (
    <div className="ma-form-group full-width ma-upload-section">
      <label className="ma-form-label">
        Class Photo <span className={required ? "required" : "optional"}>*</span>
      </label>
      
      <div 
        className={`ma-upload-area ${previewImage ? 'has-image' : ''} ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="ma-upload-input"
          id="ma-photo-upload"
          required={required && !previewImage}
        />
        <label htmlFor="ma-photo-upload">
          {previewImage ? (
            <div className="ma-image-preview">
              <img src={previewImage} alt="Class preview" className="ma-preview-img" />
              <div className="ma-preview-overlay">
                <button 
                  type="button" 
                  onClick={onClearImage} 
                  className="ma-change-photo-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Change Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="ma-upload-placeholder">
              <div className="ma-upload-icon-wrapper">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="ma-upload-text">
                <h4>Click to upload class photo</h4>
                <p>or drag and drop your image here</p>
              </div>
              <div className="ma-upload-formats">
                <span className="ma-format-tag">JPG</span>
                <span className="ma-format-tag">PNG</span>
                <span className="ma-format-tag">WEBP</span>
              </div>
            </div>
          )}
        </label>
      </div>
      
      <span className="ma-form-hint">
        Upload a clear photo with all student faces visible for accurate detection
      </span>
    </div>
  );
}
