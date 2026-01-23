import React, { useState, useEffect } from 'react';
import BatchAttendance from './BatchAttendance';
import AttendanceConfirmModal from './AttendanceConfirmModal';

export default function MarkAttendance({ 
  attendanceForm, 
  setAttendanceForm, 
  onSubmit, 
  processing, 
  showMessage,
  // New props for preview flow
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

  // Clear preview image when form is reset (classPhoto becomes null)
  useEffect(() => {
    if (!attendanceForm.classPhoto) {
      setPreviewImage(null);
    }
  }, [attendanceForm.classPhoto]);

  // Load available classes
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
      console.log('Loading classes from:', `${API_BASE}/student/classes`);
      const response = await fetch(`${API_BASE}/student/classes`);
      if (response.ok) {
        const data = await response.json();
        console.log('Classes loaded:', data);
        setClasses(data);
      } else {
        console.error('Failed to load classes:', response.status, response.statusText);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttendanceForm({ ...attendanceForm, classPhoto: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setAttendanceForm({ ...attendanceForm, classPhoto: null });
    setPreviewImage(null);
  };

  // Handle form submit - trigger preview instead of direct submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onPreview) {
      onPreview(e);
    } else {
      // Fallback to legacy direct submission
      onSubmit(e);
    }
  };

  return (
    <div className="attendance-tab">
      <div className="section-header">
        <div className="section-icon">📸</div>
        <div className="section-title">
          <h2>Mark Attendance</h2>
          <p>Upload a class photo to automatically identify and mark attendance</p>
        </div>
      </div>

      {/* Attendance Mode Toggle */}
      <div style={{ 
        marginBottom: 24, 
        padding: 16, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 8,
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#495057' }}>Attendance Mode:</span>
          <button 
            onClick={() => setShowBatch(false)}
            style={{ 
              padding: '8px 16px', 
              border: '1px solid #ced4da', 
              backgroundColor: !showBatch ? '#007bff' : 'white', 
              color: !showBatch ? 'white' : '#495057', 
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📸 Single Photo
          </button>
          <button 
            onClick={() => setShowBatch(true)}
            style={{ 
              padding: '8px 16px', 
              border: '1px solid #ced4da', 
              backgroundColor: showBatch ? '#28a745' : 'white', 
              color: showBatch ? 'white' : '#495057', 
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📷 Batch Photos (Large Classes)
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: '#6c757d' }}>
          {showBatch 
            ? 'Upload 3-5 photos for classes with 100+ students arranged in rows'
            : 'Upload a single photo for regular class attendance'
          }
        </div>
      </div>

      {/* Conditional Content Based on Mode */}
      {showBatch ? (
        <BatchAttendance showMessage={showMessage} />
      ) : (
        <div className="modern-form">
          <form onSubmit={handleFormSubmit} encType="multipart/form-data">
          <div className="form-row">
            <div className="form-group">
              <label>Session Name *</label>
              <input
                type="text"
                value={attendanceForm.sessionName}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, sessionName: e.target.value })}
                placeholder="e.g., Morning Session, Practical Class, Theory Lecture"
                required
              />
              <small>Enter a descriptive name for this attendance session</small>
            </div>
            
            <div className="form-group">
              <label>Select Class *</label>
              {loadingClasses ? (
                <select disabled>
                  <option>Loading classes...</option>
                </select>
              ) : (
                <select 
                  value={attendanceForm.class_id || ''} 
                  onChange={(e) => {
                    setAttendanceForm({ ...attendanceForm, class_id: e.target.value, subject_id: '' });
                  }} 
                  required
                >
                  <option value="">Choose class for attendance</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section} ({cls.student_count || 0} students)
                    </option>
                  ))}
                </select>
              )}
              <small>Select the class for which you want to mark attendance</small>
            </div>

            <div className="form-group">
              <label>Select Subject (Optional)</label>
              {loadingSubjects ? (
                <select disabled>
                  <option>Loading subjects...</option>
                </select>
              ) : (
                <select 
                  value={attendanceForm.subject_id || ''} 
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, subject_id: e.target.value })}
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
              <small>Select a specific subject for subject-wise attendance</small>
            </div>
          </div>
          
          <div className="form-group">
            <label>Class Photo *</label>
            <div className="photo-upload-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
                style={{ display: 'none' }}
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="upload-area">
                {previewImage ? (
                  <div className="image-preview">
                    <img src={previewImage} alt="Preview" className="preview-image" />
                    <div className="image-overlay">
                      <button type="button" onClick={clearImage} className="clear-btn">
                        🗑️ Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon">📷</div>
                    <div className="upload-text">
                      <strong>Click to upload class photo</strong>
                      <p>Drag and drop or click to select</p>
                    </div>
                  </div>
                )}
              </label>
            </div>
            <small>Upload a clear photo containing faces of students in the class</small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={processing} className="modern-btn primary">
              {processing ? (
                <>
                  <span className="btn-icon">⏳</span>
                  Processing Photo...
                </>
              ) : (
                <>
                  <span className="btn-icon">🔍</span>
                  Process & Preview
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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
