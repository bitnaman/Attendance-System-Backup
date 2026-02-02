import React, { useState, useEffect, useCallback } from 'react';
import ModeToggle from './ModeToggle';
import SessionForm from './SessionForm';
import BatchAttendanceNew from './BatchAttendanceNew';
import ConfirmModalNew from './ConfirmModalNew';
import './styles/mark-attendance-new.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * MarkAttendanceNew Component
 * Main orchestrator component for the Mark Attendance feature
 * Redesigned with modern styling and modular architecture
 */
export default function MarkAttendanceNew({ 
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

  const handleModeChange = useCallback((isBatch) => {
    setShowBatch(isBatch);
  }, []);

  return (
    <div className="ma-container">
      {/* Header Section */}
      <header className="ma-header">
        <div className="ma-header-icon">📸</div>
        <div className="ma-header-content">
          <h1>Mark Attendance</h1>
          <p>Upload a class photo to automatically identify and mark attendance for your students using AI-powered facial recognition</p>
        </div>
      </header>

      {/* Mode Toggle */}
      <ModeToggle 
        showBatch={showBatch} 
        onModeChange={handleModeChange} 
      />

      {/* Content Based on Mode */}
      {showBatch ? (
        <BatchAttendanceNew showMessage={showMessage} />
      ) : (
        <SessionForm
          attendanceForm={attendanceForm}
          onFormChange={handleFormChange}
          onFileChange={handleFileChange}
          onSubmit={handleFormSubmit}
          onClearImage={clearImage}
          previewImage={previewImage}
          processing={processing}
          classes={classes}
          subjects={subjects}
          loadingClasses={loadingClasses}
          loadingSubjects={loadingSubjects}
        />
      )}

      {/* Attendance Confirmation Modal */}
      <ConfirmModalNew
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={onConfirmAttendance}
        previewData={previewData}
        processing={confirmProcessing}
      />
    </div>
  );
}
