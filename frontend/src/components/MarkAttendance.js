import React, { useState, useEffect, useCallback } from 'react';
import BatchAttendance from './BatchAttendance';
import AttendanceConfirmModal from './AttendanceConfirmModal';
import '../styles/mark-attendance.css';

export default function MarkAttendance({ 
  attendanceForm, 
  setAttendanceForm, 
  onSubmit, 
  processing, 
  showMessage,
  onPreview,
  previewData,
  showConfirmModal,
  setShowConfirmModal,
  onConfirmAttendance,
  confirmProcessing
}) {
  const [showBatch, setShowBatch] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  // Clear preview image when form is reset
  useEffect(() => {
    if (!attendanceForm.classPhoto) {
      setPreviewImage(null);
    }
  }, [attendanceForm.classPhoto]);

  // Load available classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Load subjects when class is selected
  useEffect(() => {
    if (attendanceForm.class_id) {
      loadSubjects(attendanceForm.class_id);
    } else {
      setSubjects([]);
    }
  }, [attendanceForm.class_id]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch(`${API_BASE}/student/classes`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoadingClasses(false);
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

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setAttendanceForm(prev => ({ ...prev, classPhoto: file }));
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  }, [setAttendanceForm]);

  const clearImage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAttendanceForm(prev => ({ ...prev, classPhoto: null }));
    setPreviewImage(null);
  }, [setAttendanceForm]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onPreview) {
      onPreview(e);
    } else {
      onSubmit(e);
    }
  };

  const handleFormChange = useCallback((field, value) => {
    setAttendanceForm(prev => ({ ...prev, [field]: value }));
  }, [setAttendanceForm]);

  return (
    <div className="mark-attendance-container">
      {/* Header Section */}
      <div className="ma-header">
        <div className="ma-header-icon">📸</div>
        <div className="ma-header-content">
          <h2>Mark Attendance</h2>
          <p>Upload a class photo to automatically identify and mark attendance for your students</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="ma-mode-toggle">
        <div className="ma-mode-label">
          <span>📋</span>
          <span>Attendance Mode</span>
        </div>
        <div className="ma-mode-buttons">
          <button 
            type="button"
            className={`ma-mode-btn ${!showBatch ? 'active' : ''}`}
            onClick={() => setShowBatch(false)}
          >
            <div className="ma-mode-icon">📷</div>
            <div className="ma-mode-info">
              <h4>Single Photo</h4>
              <p>Best for classes up to 60 students</p>
            </div>
          </button>
          <button 
            type="button"
            className={`ma-mode-btn batch ${showBatch ? 'active' : ''}`}
            onClick={() => setShowBatch(true)}
          >
            <div className="ma-mode-icon">🖼️</div>
            <div className="ma-mode-info">
              <h4>Batch Photos</h4>
              <p>Upload 3-5 photos for large classes (100+)</p>
            </div>
          </button>
        </div>
      </div>

      {/* Content Based on Mode */}
      {showBatch ? (
        <BatchAttendance showMessage={showMessage} />
      ) : (
        <SinglePhotoForm
          attendanceForm={attendanceForm}
          handleFormChange={handleFormChange}
          handleFileChange={handleFileChange}
          handleFormSubmit={handleFormSubmit}
          clearImage={clearImage}
          previewImage={previewImage}
          processing={processing}
          classes={classes}
          subjects={subjects}
          loadingClasses={loadingClasses}
          loadingSubjects={loadingSubjects}
        />
      )}

      {/* Attendance Confirmation Modal */}
      <AttendanceConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={onConfirmAttendance}
        previewData={previewData}
        processing={confirmProcessing}
      />
    </div>
  );
}

// Single Photo Form Component
function SinglePhotoForm({
  attendanceForm,
  handleFormChange,
  handleFileChange,
  handleFormSubmit,
  clearImage,
  previewImage,
  processing,
  classes,
  subjects,
  loadingClasses,
  loadingSubjects
}) {
  return (
    <div className="ma-form-card">
      <div className="ma-form-header">
        <span className="ma-form-header-icon">✏️</span>
        <h3>Session Details</h3>
      </div>
      <div className="ma-form-body">
        <form onSubmit={handleFormSubmit}>
          <div className="ma-form-grid">
            {/* Session Name */}
            <div className="ma-form-group">
              <label className="ma-form-label">
                Session Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="ma-form-input"
                value={attendanceForm.sessionName}
                onChange={(e) => handleFormChange('sessionName', e.target.value)}
                placeholder="e.g., Morning Lecture, Lab Session, Tutorial"
                required
              />
              <span className="ma-form-hint">Give a descriptive name for this attendance session</span>
            </div>

            {/* Class Selection */}
            <div className="ma-form-group">
              <label className="ma-form-label">
                Select Class <span className="required">*</span>
              </label>
              {loadingClasses ? (
                <select className="ma-form-select" disabled>
                  <option>Loading classes...</option>
                </select>
              ) : (
                <select 
                  className="ma-form-select"
                  value={attendanceForm.class_id || ''} 
                  onChange={(e) => {
                    handleFormChange('class_id', e.target.value);
                    handleFormChange('subject_id', '');
                  }} 
                  required
                >
                  <option value="">Choose a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section} ({cls.student_count || 0} students)
                    </option>
                  ))}
                </select>
              )}
              <span className="ma-form-hint">Select the class for which you want to mark attendance</span>
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
                  value={attendanceForm.subject_id || ''} 
                  onChange={(e) => handleFormChange('subject_id', e.target.value)}
                  disabled={!attendanceForm.class_id}
                >
                  <option value="">General Attendance (No specific subject)</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} {subject.code && `(${subject.code})`}
                    </option>
                  ))}
                </select>
              )}
              <span className="ma-form-hint">Link attendance to a specific subject if needed</span>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="ma-form-group full-width ma-upload-section">
            <label className="ma-form-label">
              Class Photo <span className="required">*</span>
            </label>
            <div className={`ma-upload-area ${previewImage ? 'has-image' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="ma-upload-input"
                id="ma-photo-upload"
                required={!previewImage}
              />
              <label htmlFor="ma-photo-upload">
                {previewImage ? (
                  <div className="ma-image-preview">
                    <img src={previewImage} alt="Class preview" className="ma-preview-img" />
                    <div className="ma-preview-overlay">
                      <button type="button" onClick={clearImage} className="ma-change-photo-btn">
                        🔄 Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ma-upload-placeholder">
                    <div className="ma-upload-icon">📷</div>
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

          {/* Submit Button */}
          <div className="ma-form-actions">
            <button 
              type="submit" 
              disabled={processing} 
              className="ma-submit-btn"
            >
              {processing ? (
                <>
                  <span className="ma-btn-spinner"></span>
                  Processing Photo...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Process & Preview Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}