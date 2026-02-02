import React from 'react';
import PhotoUploader from './PhotoUploader';

/**
 * SessionForm Component
 * Handles the single photo attendance form with session details
 */
export default function SessionForm({
  attendanceForm,
  onFormChange,
  onFileChange,
  onSubmit,
  onClearImage,
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
        <form onSubmit={onSubmit}>
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
                onChange={(e) => onFormChange('sessionName', e.target.value)}
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
                    onFormChange('class_id', e.target.value);
                    onFormChange('subject_id', '');
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
                  onChange={(e) => onFormChange('subject_id', e.target.value)}
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
          <PhotoUploader
            previewImage={previewImage}
            onFileChange={onFileChange}
            onClearImage={onClearImage}
            required={true}
          />

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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
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
