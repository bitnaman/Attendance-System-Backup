import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/edit-student-modal.css';

const EditStudentModal = ({ student, onUpdate, onCancel, updating }) => {
  const [classes, setClasses] = useState([]);
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    roll_no: '',
    prn: '',
    seat_no: '',
    class_id: '',
    email: '',
    phone: '',
    photo: null
  });

  // Initialize form with student data
  useEffect(() => {
    if (student) {
      setEditForm({
        name: student.name || '',
        age: student.age || '',
        roll_no: student.roll_no || '',
        prn: student.prn || '',
        seat_no: student.seat_no || '',
        class_id: student.class_id || '',
        email: student.email || '',
        phone: student.phone || '',
        photo: null
      });
    }
  }, [student]);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('http://localhost:8000/student/classes', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setClasses(data);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('age', editForm.age);
    formData.append('roll_no', editForm.roll_no);
    formData.append('prn', editForm.prn);
    formData.append('seat_no', editForm.seat_no);
    formData.append('class_id', editForm.class_id);
    formData.append('email', editForm.email);
    formData.append('phone', editForm.phone);
    
    if (editForm.photo) {
      formData.append('photo', editForm.photo);
    }

    await onUpdate(student.id, formData);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onCancel();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !updating) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, updating]);

  if (!student) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="edit-student-modal">
        {/* Modal Header */}
        <div className="modal-header edit-modal-header">
          <h2>✏️ Edit Student</h2>
          <button 
            className="close-btn" 
            onClick={onCancel}
            disabled={updating}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Student Info Summary */}
          <div className="student-summary">
            <div className="student-avatar-edit">
              {student.photo_path ? (
                <img 
                  src={`http://localhost:8000/static/student_photos/${student.photo_path}`}
                  alt={student.name}
                  className="student-edit-photo"
                />
              ) : (
                <div className="student-edit-photo-placeholder">
                  {student.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="student-summary-info">
              <h3>{student.name}</h3>
              <p>Roll No: {student.roll_no} | PRN: {student.prn}</p>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Name <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  required 
                  disabled={updating}
                />
              </div>
              <div className="form-group">
                <label>Age <span className="required">*</span></label>
                <input 
                  type="number" 
                  value={editForm.age} 
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} 
                  required 
                  disabled={updating}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Roll No <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={editForm.roll_no} 
                  onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })} 
                  required 
                  disabled={updating}
                />
              </div>
              <div className="form-group">
                <label>PRN <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={editForm.prn} 
                  onChange={(e) => setEditForm({ ...editForm, prn: e.target.value })} 
                  required 
                  disabled={updating}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Seat No <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={editForm.seat_no} 
                  onChange={(e) => setEditForm({ ...editForm, seat_no: e.target.value })} 
                  required 
                  disabled={updating}
                />
              </div>
              <div className="form-group">
                <label>Class <span className="required">*</span></label>
                <select 
                  value={editForm.class_id || ''} 
                  onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
                  required
                  disabled={updating}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                  disabled={updating}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  type="text" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                  disabled={updating}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Update Photo (Optional)</label>
              <div className="photo-upload-area">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setEditForm({ ...editForm, photo: e.target.files[0] })} 
                  disabled={updating}
                  id="photo-upload"
                  className="photo-input"
                />
                <label htmlFor="photo-upload" className="photo-upload-label">
                  {editForm.photo ? (
                    <span className="photo-selected">
                      📷 {editForm.photo.name}
                    </span>
                  ) : (
                    <span className="photo-placeholder">
                      📷 Click to select a new photo
                    </span>
                  )}
                </label>
              </div>
              {editForm.photo && (
                <button 
                  type="button" 
                  className="clear-photo-btn"
                  onClick={() => setEditForm({ ...editForm, photo: null })}
                  disabled={updating}
                >
                  ✕ Remove selected photo
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onCancel}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-btn" 
                disabled={updating}
              >
                {updating ? (
                  <>
                    <span className="spinner"></span>
                    Updating...
                  </>
                ) : (
                  <>💾 Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

EditStudentModal.propTypes = {
  student: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  updating: PropTypes.bool.isRequired,
};

export default EditStudentModal;
