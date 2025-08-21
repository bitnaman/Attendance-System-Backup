import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const EditStudentForm = ({ editForm, setEditForm, onUpdate, onCancel, updating }) => {
  const [classes, setClasses] = useState([]);

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

  return (
    <div className="edit-student-form modern-form" style={{ marginTop: '2rem' }}>
      <div className="form-header"><h4>Edit Student</h4></div>
      <form onSubmit={onUpdate} encType="multipart/form-data">
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Roll No</label>
            <input type="text" value={editForm.roll_no} onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>PRN</label>
            <input type="text" value={editForm.prn} onChange={(e) => setEditForm({ ...editForm, prn: e.target.value })} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Seat No</label>
            <input type="text" value={editForm.seat_no} onChange={(e) => setEditForm({ ...editForm, seat_no: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select 
              value={editForm.class_id || ''} 
              onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
              required
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
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group full-width">
            <label>Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setEditForm({ ...editForm, photo: e.target.files[0] })} />
          </div>
        </div>
        <div className="modern-actions">
          <button type="submit" className="modern-btn success" disabled={updating}>
            {updating ? 'Updating…' : 'Update Student'}
          </button>
          <button type="button" className="modern-btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

EditStudentForm.propTypes = {
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  updating: PropTypes.bool.isRequired,
};

export default EditStudentForm;
