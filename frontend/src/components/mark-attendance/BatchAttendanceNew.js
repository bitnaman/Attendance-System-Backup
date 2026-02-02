import React, { useState, useEffect, useCallback } from 'react';
import { fetchExportClasses } from '../../api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * BatchAttendanceNew Component
 * Handles multi-photo batch attendance for large classes (100+ students)
 */
export default function BatchAttendanceNew({ showMessage }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionType, setSessionType] = useState('normal');
  const [photos, setPhotos] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const data = await fetchExportClasses();
      setClasses(data.classes || []);
    } catch (e) {
      showMessage?.('Failed to load classes', 'error');
    }
  }, [showMessage]);

  const loadSubjects = useCallback(async (classId) => {
    try {
      setLoadingSubjects(true);
      const response = await fetch(`${API_BASE}/subjects/class/${classId}`);
      if (response.status === 401) {
        showMessage?.('Session expired. Please log in again.', 'error');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadSubjects(selectedClass);
    } else {
      setSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedClass, loadSubjects]);

  const handlePhotoUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      showMessage('Maximum 5 photos allowed for batch processing', 'error');
      return;
    }
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      showMessage('Only image files are allowed', 'error');
    }
    setPhotos(validFiles);
  }, [showMessage]);

  const removePhoto = useCallback((index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processBatchPhotos = async () => {
    if (!selectedClass || photos.length === 0 || !sessionName.trim()) {
      showMessage('Please select class, enter session name, and upload photos', 'error');
      return;
    }

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('class_id', selectedClass);
      if (selectedSubject) {
        formData.append('subject_id', selectedSubject);
      }
      formData.append('session_name', sessionName);
      formData.append('session_type', sessionType);
      
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const response = await fetch(`${API_BASE}/attendance/process-batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to process batch photos');
      }

      const data = await response.json();
      setPreviewData(data);
      setShowPreview(true);
      showMessage('Photos processed successfully! Review and confirm attendance.', 'success');
    } catch (e) {
      showMessage(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const commitAttendance = async (presentStudentIds, statusOverrides = {}) => {
    if (!previewData) return;

    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE}/attendance/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          sessionCandidateId: previewData.sessionCandidateId,
          presentStudentIds,
          statusOverrides
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to commit attendance');
      }

      showMessage('Attendance saved successfully!', 'success');
      setShowPreview(false);
      setPreviewData(null);
      setPhotos([]);
      setSessionName('');
    } catch (e) {
      showMessage(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/static/')) return `${API_BASE}${photoPath}`;
    return `${API_BASE}/static/${photoPath}`;
  };

  // Show batch preview modal
  if (showPreview && previewData) {
    return (
      <BatchPreviewModal
        previewData={previewData}
        onCommit={commitAttendance}
        onCancel={() => setShowPreview(false)}
        processing={processing}
        getPhotoUrl={getPhotoUrl}
      />
    );
  }

  return (
    <div className="ma-batch-container">
      {/* Batch Mode Info Banner */}
      <div className="ma-batch-banner">
        <div className="ma-batch-banner-icon">📷</div>
        <div className="ma-batch-banner-content">
          <h4>Batch Mode Active</h4>
          <p>
            Upload 3-5 photos of your class (arranged in rows) to process attendance for large batches (100+ students).
            The system will automatically detect and identify students across all photos.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="ma-form-card">
        <div className="ma-form-header">
          <span className="ma-form-header-icon">✏️</span>
          <h3>Batch Session Details</h3>
        </div>
        
        <div className="ma-form-body">
          <div className="ma-form-grid">
            {/* Class Selection */}
            <div className="ma-form-group">
              <label className="ma-form-label">
                Select Class <span className="required">*</span>
              </label>
              <select 
                className="ma-form-select"
                value={selectedClass} 
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSubject('');
                }}
              >
                <option value="">Choose a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || `${c.name} - ${c.section}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div className="ma-form-group">
              <label className="ma-form-label">
                Subject <span className="optional">(Optional)</span>
              </label>
              {loadingSubjects ? (
                <select className="ma-form-select" disabled>
                  <option>Loading subjects...</option>
                </select>
              ) : (
                <select 
                  className="ma-form-select"
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                >
                  <option value="">General Attendance (No specific subject)</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} {subject.code && `(${subject.code})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Session Name */}
            <div className="ma-form-group">
              <label className="ma-form-label">
                Session Name <span className="required">*</span>
              </label>
              <input 
                type="text"
                className="ma-form-input"
                value={sessionName} 
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Morning Session, Lecture 1"
              />
            </div>

            {/* Session Type */}
            <div className="ma-form-group">
              <label className="ma-form-label">Session Type</label>
              <select 
                className="ma-form-select"
                value={sessionType} 
                onChange={(e) => setSessionType(e.target.value)}
              >
                <option value="normal">Normal Attendance</option>
                <option value="extra">Extra Session</option>
              </select>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="ma-form-group full-width ma-upload-section">
            <label className="ma-form-label">
              Class Photos <span className="required">*</span>
              <span className="optional" style={{ marginLeft: '0.5rem' }}>(3-5 photos recommended)</span>
            </label>
            <div className="ma-upload-area">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handlePhotoUpload}
                className="ma-upload-input"
                id="batch-photo-upload"
              />
              <label htmlFor="batch-photo-upload">
                <div className="ma-upload-placeholder">
                  <div className="ma-upload-icon-wrapper">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      <circle cx="13" cy="9" r="2"/>
                      <path d="M20 16H8l4-5 2 2 4-5 2 3v5z"/>
                    </svg>
                  </div>
                  <div className="ma-upload-text">
                    <h4>Click to upload photos</h4>
                    <p>Upload 3-5 photos of your class (max 5 photos)</p>
                  </div>
                  <div className="ma-upload-formats">
                    <span className="ma-format-tag">JPG</span>
                    <span className="ma-format-tag">PNG</span>
                    <span className="ma-format-tag">WEBP</span>
                  </div>
                </div>
              </label>
            </div>

            {/* Photo Preview Grid */}
            {photos.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div className="ma-photos-header">
                  <span className="ma-photos-count">
                    Uploaded Photos (<span>{photos.length}</span>/5)
                  </span>
                </div>
                <div className="ma-photos-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="ma-photo-item">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Photo ${index + 1}`}
                      />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="ma-photo-remove"
                      >
                        ✕
                      </button>
                      <div className="ma-photo-number">Photo {index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="ma-form-actions">
            <button 
              type="button"
              onClick={processBatchPhotos}
              disabled={processing || !selectedClass || photos.length === 0 || !sessionName.trim()}
              className="ma-submit-btn batch"
            >
              {processing ? (
                <>
                  <span className="ma-btn-spinner"></span>
                  Processing Photos...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
                  </svg>
                  Process Batch Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="ma-instructions">
        <h5>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          Instructions for Large Classes
        </h5>
        <ul>
          <li>Arrange students in 3-5 rows for better photo coverage</li>
          <li>Take photos from different angles to capture all students</li>
          <li>Ensure good lighting and clear visibility of faces</li>
          <li>Upload 3-5 photos maximum for optimal processing</li>
          <li>Review the preview list before confirming attendance</li>
          <li>Manually check/uncheck students as needed</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * BatchPreviewModal Component
 * Shows detected students and allows review before committing
 */
function BatchPreviewModal({ previewData, onCommit, onCancel, processing, getPhotoUrl }) {
  const [presentStudents, setPresentStudents] = useState(new Set());
  const [statusOverrides, setStatusOverrides] = useState({});

  useEffect(() => {
    const detectedIds = previewData.detectedStudents.map(s => s.student_id);
    setPresentStudents(new Set(detectedIds));
  }, [previewData]);

  const handleStudentToggle = useCallback((studentId) => {
    setPresentStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

  const handleStatusChange = useCallback((studentId, status) => {
    setStatusOverrides(prev => ({
      ...prev,
      [studentId]: status
    }));
  }, []);

  const handleCommit = () => {
    onCommit(Array.from(presentStudents), statusOverrides);
  };

  const allStudents = [...previewData.detectedStudents, ...previewData.undetected];

  return (
    <div className="ma-modal-overlay">
      <div className="ma-modal ma-batch-modal">
        {/* Header */}
        <div className="ma-modal-header">
          <div className="ma-modal-header-content">
            <div className="ma-modal-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="ma-modal-header-text">
              <h2>Review Attendance</h2>
              <p>
                Detected: {previewData.detectedStudents.length} students • 
                Total in class: {allStudents.length} students
                {previewData.stats && (
                  <> • Detection Rate: {previewData.stats.detectionRate}%</>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="ma-modal-close"
            disabled={processing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Enhanced Statistics Banner */}
        {previewData.stats && (
          <div className="ma-batch-stats">
            <div className="ma-batch-stat">
              <div className="ma-batch-stat-value photos">{previewData.stats.photosProcessed}</div>
              <div className="ma-batch-stat-label">Photos</div>
            </div>
            <div className="ma-batch-stat">
              <div className="ma-batch-stat-value detected">{previewData.stats.totalDetected}</div>
              <div className="ma-batch-stat-label">Detected</div>
            </div>
            <div className="ma-batch-stat">
              <div className="ma-batch-stat-value undetected">{previewData.stats.totalUndetected}</div>
              <div className="ma-batch-stat-label">Undetected</div>
            </div>
            <div className="ma-batch-stat">
              <div className="ma-batch-stat-value multi">{previewData.stats.multiPhotoDetections}</div>
              <div className="ma-batch-stat-label">Multi-Photo ✓</div>
            </div>
            <div className="ma-batch-stat">
              <div className="ma-batch-stat-value rate">{previewData.stats.detectionRate}%</div>
              <div className="ma-batch-stat-label">Rate</div>
            </div>
          </div>
        )}

        {/* Photo Preview */}
        {previewData.photoUrls && previewData.photoUrls.length > 0 && (
          <div className="ma-batch-photos">
            <h4>Uploaded Photos</h4>
            <div className="ma-batch-photos-row">
              {previewData.photoUrls.map((url, index) => (
                <img 
                  key={index}
                  src={getPhotoUrl(url)} 
                  alt={`Photo ${index + 1}`}
                  className="ma-batch-photo-thumb"
                />
              ))}
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="ma-batch-list">
          {allStudents.map((student) => {
            const isDetected = previewData.detectedStudents.some(s => s.student_id === student.student_id);
            const isPresent = presentStudents.has(student.student_id);
            const detectedStudent = isDetected 
              ? previewData.detectedStudents.find(s => s.student_id === student.student_id)
              : null;
            const confidence = detectedStudent?.confidence || 0;
            const detectionCount = detectedStudent?.detection_count || 0;
            const detectedInPhotos = detectedStudent?.detected_in_photos || [];

            return (
              <div 
                key={student.student_id} 
                className={`ma-batch-student-row ${isDetected ? 'detected' : 'not-detected'}`}
              >
                <input 
                  type="checkbox" 
                  checked={isPresent}
                  onChange={() => handleStudentToggle(student.student_id)}
                  className="ma-batch-checkbox"
                />
                
                <span className="ma-batch-name">{student.name}</span>
                
                {isDetected ? (
                  <span className="ma-batch-badge detected" title={
                    detectionCount > 1 
                      ? `Detected in photos: ${detectedInPhotos.join(', ')}` 
                      : `Detected in photo ${detectedInPhotos[0] || 1}`
                  }>
                    ✓ Detected ({(confidence * 100).toFixed(1)}%)
                    {detectionCount > 1 && (
                      <span className="ma-batch-multi-badge">{detectionCount}x</span>
                    )}
                  </span>
                ) : (
                  <span className="ma-batch-badge not-detected">
                    Not Detected
                  </span>
                )}

                <select 
                  value={statusOverrides[student.student_id] || (isPresent ? 'present' : 'absent')}
                  onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                  className="ma-batch-status"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="medical">Medical Leave</option>
                  <option value="authorized">Authorized Absence</option>
                </select>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="ma-batch-footer">
          <div className="ma-batch-summary">
            <strong>Summary:</strong> {presentStudents.size} present, {allStudents.length - presentStudents.size} absent
          </div>
          <div className="ma-batch-actions">
            <button 
              onClick={onCancel}
              disabled={processing}
              className="ma-btn secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleCommit}
              disabled={processing}
              className="ma-btn primary"
            >
              {processing ? (
                <>
                  <span className="ma-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
