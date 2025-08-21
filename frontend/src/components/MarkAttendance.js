import React, { useState, useEffect } from 'react';
import UploadPanel from '../UploadPanel';

export default function MarkAttendance({ attendanceForm, setAttendanceForm, onSubmit, processing, onQuickAttendance }) {
  const [showQuick, setShowQuick] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  // Load available classes
  useEffect(() => {
    loadClasses();
  }, []);

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

  return (
    <div className="attendance-tab">
      <div className="section-header">
        <div className="section-icon">📸</div>
        <div className="section-title">
          <h2>Mark Attendance</h2>
          <p>Upload a class photo to automatically identify and mark attendance</p>
        </div>
      </div>

      <div className="modern-form">
        <form onSubmit={onSubmit} encType="multipart/form-data">
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
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, class_id: e.target.value })} 
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
                  Processing Attendance...
                </>
              ) : (
                <>
                  <span className="btn-icon">✅</span>
                  Mark Attendance
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Upload Alternative */}
        <div className="quick-upload-section">
          <button 
            type="button" 
            onClick={() => setShowQuick(!showQuick)} 
            className="modern-btn secondary"
          >
            <span className="btn-icon">⚡</span>
            {showQuick ? 'Hide Quick Upload' : 'Quick Upload Alternative'}
          </button>
          
          {showQuick && (
            <div className="quick-upload-panel">
              <UploadPanel onUpload={onQuickAttendance} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
