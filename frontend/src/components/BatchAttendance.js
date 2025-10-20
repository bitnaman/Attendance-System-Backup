import React, { useState, useEffect } from 'react';
import { fetchExportClasses } from '../api';

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

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      showMessage('Maximum 5 photos allowed for batch processing', 'error');
      return;
    }
    
    // Validate file types
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      showMessage('Only image files are allowed', 'error');
    }
    
    setPhotos(validFiles);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

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
      
      photos.forEach((photo, index) => {
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
    <div style={{ padding: 16 }}>
      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: 16, 
        borderRadius: 8, 
        border: '1px solid #c3e6c3',
        marginBottom: 20
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>📷 Batch Mode Active</h4>
        <p style={{ margin: 0, color: '#2e7d32', fontSize: 14 }}>
          Upload 3-5 photos of your class (arranged in rows) to process attendance for large batches (100+ students).
          The system will automatically detect and identify students across all photos.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
        {/* Class Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Select Class</label>
          <select 
            value={selectedClass} 
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
            }}
            style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="">-- Select Class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.display_name || `${c.name} - ${c.section}`}</option>
            ))}
          </select>
        </div>

        {/* Subject Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Select Subject (Optional)
          </label>
          {loadingSubjects ? (
            <select disabled style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4 }}>
              <option>Loading subjects...</option>
            </select>
          ) : (
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4 }}
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

        {/* Session Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Session Name</label>
            <input 
              type="text" 
              value={sessionName} 
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Morning Session, Lecture 1"
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Session Type</label>
            <select 
              value={sessionType} 
              onChange={(e) => setSessionType(e.target.value)}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="normal">Normal Attendance</option>
              <option value="extra">Extra Session</option>
            </select>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Upload Class Photos (3-5 photos)</label>
          <div style={{ 
            border: '2px dashed #ddd', 
            borderRadius: 8, 
            padding: 20, 
            textAlign: 'center',
            backgroundColor: '#f9f9f9'
          }}>
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              id="photo-upload"
            />
            <label 
              htmlFor="photo-upload" 
              style={{ 
                cursor: 'pointer', 
                display: 'block',
                color: '#007bff',
                fontWeight: 'bold'
              }}
            >
              📸 Click to upload photos or drag and drop
            </label>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 14 }}>
              Upload 3-5 photos of your class arranged in rows (max 5 photos)
            </p>
          </div>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Uploaded Photos ({photos.length}/5)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {photos.map((photo, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img 
                      src={URL.createObjectURL(photo)} 
                      alt={`Photo ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: 120, 
                        objectFit: 'cover', 
                        borderRadius: 8,
                        border: '1px solid #ddd'
                      }}
                    />
                    <button 
                      onClick={() => removePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      ✖
                    </button>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 4, 
                      left: 4, 
                      background: 'rgba(0,0,0,0.7)', 
                      color: 'white', 
                      padding: '2px 6px', 
                      borderRadius: 4, 
                      fontSize: 12 
                    }}>
                      Photo {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Process Button */}
        <button 
          onClick={processBatchPhotos}
          disabled={processing || !selectedClass || photos.length === 0 || !sessionName.trim()}
          style={{ 
            padding: 16, 
            backgroundColor: processing ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: 8,
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          {processing ? '🔄 Processing Photos...' : '🚀 Process Batch Attendance'}
        </button>

        {/* Instructions */}
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: 16, 
          borderRadius: 8, 
          border: '1px solid #bbdefb' 
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>📋 Instructions for Large Classes</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#1976d2' }}>
            <li>Arrange students in 3-5 rows for better photo coverage</li>
            <li>Take photos from different angles to capture all students</li>
            <li>Ensure good lighting and clear visibility of faces</li>
            <li>Upload 3-5 photos maximum for optimal processing</li>
            <li>Review the preview list before confirming attendance</li>
            <li>Manually check/uncheck students as needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Batch Preview Component
function BatchPreview({ previewData, onCommit, onCancel, processing, getPhotoUrl }) {
  const [presentStudents, setPresentStudents] = useState(new Set());
  const [statusOverrides, setStatusOverrides] = useState({});

  useEffect(() => {
    // Pre-check detected students as present
    const detectedIds = previewData.detectedStudents.map(s => s.student_id);
    setPresentStudents(new Set(detectedIds));
  }, [previewData]);

  const handleStudentToggle = (studentId) => {
    setPresentStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (studentId, status) => {
    setStatusOverrides(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleCommit = () => {
    onCommit(Array.from(presentStudents), statusOverrides);
  };

  const allStudents = [...previewData.detectedStudents, ...previewData.undetected];

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        width: '100%', 
        maxWidth: 1000, 
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: 20, 
          borderBottom: '1px solid #eee', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>Review Attendance</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Detected: {previewData.detectedStudents.length} students • 
              Total in class: {allStudents.length} students
            </p>
          </div>
          <button 
            onClick={onCancel}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            ✖ Cancel
          </button>
        </div>

        {/* Photo Preview */}
        {previewData.photoUrls && previewData.photoUrls.length > 0 && (
          <div style={{ padding: 16, borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Uploaded Photos</h4>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
              {previewData.photoUrls.map((url, index) => (
                <img 
                  key={index}
                  src={getPhotoUrl(url)} 
                  alt={`Photo ${index + 1}`}
                  style={{ 
                    width: 120, 
                    height: 80, 
                    objectFit: 'cover', 
                    borderRadius: 8,
                    border: '1px solid #ddd'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Student List */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {allStudents.map((student) => {
              const isDetected = previewData.detectedStudents.some(s => s.student_id === student.student_id);
              const isPresent = presentStudents.has(student.student_id);
              const confidence = isDetected ? previewData.detectedStudents.find(s => s.student_id === student.student_id)?.confidence : 0;

              return (
                <div key={student.student_id} style={{ 
                  padding: 16, 
                  border: '1px solid #ddd', 
                  borderRadius: 8,
                  backgroundColor: isDetected ? '#e8f5e8' : '#fff3e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <input 
                    type="checkbox" 
                    checked={isPresent}
                    onChange={() => handleStudentToggle(student.student_id)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong>{student.name}</strong>
                      {isDetected && (
                        <span style={{ 
                          padding: '2px 8px', 
                          backgroundColor: '#4caf50', 
                          color: 'white', 
                          borderRadius: 12, 
                          fontSize: 12 
                        }}>
                          Detected ({(confidence * 100).toFixed(1)}%)
                        </span>
                      )}
                      {!isDetected && (
                        <span style={{ 
                          padding: '2px 8px', 
                          backgroundColor: '#ff9800', 
                          color: 'white', 
                          borderRadius: 12, 
                          fontSize: 12 
                        }}>
                          Not Detected
                        </span>
                      )}
                    </div>
                  </div>

                  <select 
                    value={statusOverrides[student.student_id] || (isPresent ? 'present' : 'absent')}
                    onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
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
        </div>

        {/* Footer */}
        <div style={{ 
          padding: 20, 
          borderTop: '1px solid #eee', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div>
            <strong>Summary:</strong> {presentStudents.size} present, {allStudents.length - presentStudents.size} absent
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={onCancel}
              disabled={processing}
              style={{ 
                padding: '12px 24px', 
                border: '1px solid #6c757d', 
                backgroundColor: 'white', 
                color: '#6c757d', 
                borderRadius: 4,
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleCommit}
              disabled={processing}
              style={{ 
                padding: '12px 24px', 
                border: 'none', 
                backgroundColor: processing ? '#6c757d' : '#28a745', 
                color: 'white', 
                borderRadius: 4,
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              {processing ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
