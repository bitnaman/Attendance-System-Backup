import React, { useState, useEffect, useCallback } from 'react';
import { fetchExportClasses } from '../api';
import '../styles/mark-attendance.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function BatchAttendance({ showMessage }) {
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

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadSubjects(selectedClass);
    } else {
      setSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const data = await fetchExportClasses();
      setClasses(data.classes || []);
    } catch (e) {
      showMessage('Failed to load classes', 'error');
    }
  };

  const loadSubjects = async (classId) => {
    try {
      setLoadingSubjects(true);
      const response = await fetch(`${API_BASE}/subjects/class/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

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

  if (showPreview && previewData) {
    return (
      <BatchPreview
        previewData={previewData}
        onCommit={commitAttendance}
        onCancel={() => setShowPreview(false)}
        processing={processing}
        getPhotoUrl={getPhotoUrl}
      />
    );
  }

  return (
    <div className="batch-attendance-container">
      {/* Batch Mode Info Banner */}
      <div className="batch-info-banner">
        <div className="batch-info-icon">📷</div>
        <div className="batch-info-content">
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
                  <div className="ma-upload-icon">🖼️</div>
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
                <div className="batch-photo-count">Uploaded Photos ({photos.length}/5)</div>
                <div className="batch-photos-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="batch-photo-item">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Photo ${index + 1}`}
                      />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="batch-photo-remove"
                      >
                        ✕
                      </button>
                      <div className="batch-photo-number">Photo {index + 1}</div>
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
              className="ma-submit-btn"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
            >
              {processing ? (
                <>
                  <span className="ma-btn-spinner"></span>
                  Processing Photos...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Process Batch Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="batch-instructions">
        <h5>📋 Instructions for Large Classes</h5>
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

// Batch Preview Component
function BatchPreview({ previewData, onCommit, onCancel, processing, getPhotoUrl }) {
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
    <div className="batch-preview-modal">
      <div className="batch-preview-content">
        {/* Header */}
        <div className="batch-preview-header">
          <div>
            <h2>Review Attendance</h2>
            <p>
              Detected: {previewData.detectedStudents.length} students • 
              Total in class: {allStudents.length} students
              {previewData.stats && (
                <> • Detection Rate: {previewData.stats.detectionRate}%</>
              )}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="batch-preview-close"
            disabled={processing}
          >
            ✕
          </button>
        </div>

        {/* Enhanced Statistics Banner */}
        {previewData.stats && (
          <div className="batch-stats-banner" style={{
            display: 'flex',
            gap: '1rem',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '8px',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0369a1' }}>
                {previewData.stats.photosProcessed}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Photos</div>
            </div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#16a34a' }}>
                {previewData.stats.totalDetected}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Detected</div>
            </div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626' }}>
                {previewData.stats.totalUndetected}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Undetected</div>
            </div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#7c3aed' }}>
                {previewData.stats.multiPhotoDetections}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Multi-Photo ✓</div>
            </div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0891b2' }}>
                {previewData.stats.detectionRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rate</div>
            </div>
          </div>
        )}

        {/* Photo Preview */}
        {previewData.photoUrls && previewData.photoUrls.length > 0 && (
          <div className="batch-preview-photos">
            <h4>Uploaded Photos</h4>
            <div className="batch-preview-photos-row">
              {previewData.photoUrls.map((url, index) => (
                <img 
                  key={index}
                  src={getPhotoUrl(url)} 
                  alt={`Photo ${index + 1}`}
                  className="batch-preview-photo-thumb"
                />
              ))}
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="batch-preview-list">
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
                className={`batch-student-row ${isDetected ? 'detected' : 'not-detected'}`}
              >
                <input 
                  type="checkbox" 
                  checked={isPresent}
                  onChange={() => handleStudentToggle(student.student_id)}
                  className="batch-student-checkbox"
                />
                
                <span className="batch-student-name">{student.name}</span>
                
                {isDetected ? (
                  <span className="batch-student-badge detected" title={
                    detectionCount > 1 
                      ? `Detected in photos: ${detectedInPhotos.join(', ')}` 
                      : `Detected in photo ${detectedInPhotos[0] || 1}`
                  }>
                    ✓ Detected ({(confidence * 100).toFixed(1)}%)
                    {detectionCount > 1 && (
                      <span style={{ 
                        marginLeft: '4px', 
                        background: '#7c3aed', 
                        color: 'white', 
                        padding: '1px 5px', 
                        borderRadius: '10px', 
                        fontSize: '0.7rem' 
                      }}>
                        {detectionCount}x
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="batch-student-badge not-detected">
                    Not Detected
                  </span>
                )}

                <select 
                  value={statusOverrides[student.student_id] || (isPresent ? 'present' : 'absent')}
                  onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                  className="batch-student-status"
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
        <div className="batch-preview-footer">
          <div className="batch-preview-summary">
            <strong>Summary:</strong> {presentStudents.size} present, {allStudents.length - presentStudents.size} absent
          </div>
          <div className="batch-preview-actions">
            <button 
              onClick={onCancel}
              disabled={processing}
              className="batch-cancel-btn"
            >
              Cancel
            </button>
            <button 
              onClick={handleCommit}
              disabled={processing}
              className="batch-save-btn"
            >
              {processing ? 'Saving...' : '✓ Save Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
