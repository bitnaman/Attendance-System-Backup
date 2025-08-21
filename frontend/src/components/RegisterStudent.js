import React, { useState, useEffect } from 'react';

export default function RegisterStudent({
  studentForm,
  setStudentForm,
  onSubmit,
  registering
}) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showDeleteClass, setShowDeleteClass] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: '', description: '' });
  const [creatingClass, setCreatingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [selectedClassToDelete, setSelectedClassToDelete] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

  // Load available classes
  useEffect(() => {
    loadClasses();
  }, []);

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

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name || !newClass.section) {
      alert('Please fill in class name and section');
      return;
    }

    try {
      setCreatingClass(true);
      const formData = new FormData();
      formData.append('name', newClass.name);
      formData.append('section', newClass.section);
      if (newClass.description) formData.append('description', newClass.description);

      const response = await fetch(`${API_BASE}/student/classes`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await loadClasses();
        setNewClass({ name: '', section: '', description: '' });
        setShowCreateClass(false);
        alert('Class created successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Network error creating class');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassToDelete) {
      alert('Please select a class to delete');
      return;
    }

    const classToDelete = classes.find(cls => cls.id.toString() === selectedClassToDelete);
    if (!classToDelete) {
      alert('Selected class not found');
      return;
    }

    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete "${classToDelete.name} - Section ${classToDelete.section}"?\n\nThis action cannot be undone. The class can only be deleted if it has no students or attendance sessions.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingClass(true);
      const response = await fetch(`${API_BASE}/student/classes/${selectedClassToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadClasses();
        setSelectedClassToDelete('');
        setShowDeleteClass(false);
        alert('Class deleted successfully!');
        
        // If the deleted class was selected in the form, clear it
        if (studentForm.class_id === selectedClassToDelete) {
          setStudentForm({ ...studentForm, class_id: '' });
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Network error deleting class');
    } finally {
      setDeletingClass(false);
    }
  };

  return (
    <div className="register-student-tab">
      <h2>Register New Student</h2>
      <form onSubmit={onSubmit} encType="multipart/form-data" className="student-form">
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" value={studentForm.age} onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })} required />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Roll No</label>
            <input type="text" value={studentForm.roll_no} onChange={(e) => setStudentForm({ ...studentForm, roll_no: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>PRN</label>
            <input type="text" value={studentForm.prn} onChange={(e) => setStudentForm({ ...studentForm, prn: e.target.value })} required />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Seat No</label>
            <input type="text" value={studentForm.seat_no} onChange={(e) => setStudentForm({ ...studentForm, seat_no: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input type="text" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Class *</label>
            {loadingClasses ? (
              <select disabled>
                <option>Loading classes...</option>
              </select>
            ) : (
              <select 
                value={studentForm.class_id || ''} 
                onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })} 
                required
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section} ({cls.student_count} students)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Class Management */}
        <div className="class-management">
          <div className="class-management-buttons">
            <button 
              type="button" 
              className="create-class-btn"
              onClick={() => {
                setShowCreateClass(!showCreateClass);
                if (showDeleteClass) setShowDeleteClass(false);
              }}
            >
              {showCreateClass ? 'Cancel' : '+ Create New Class'}
            </button>
            
            <button 
              type="button" 
              className="delete-class-btn"
              onClick={() => {
                setShowDeleteClass(!showDeleteClass);
                if (showCreateClass) setShowCreateClass(false);
              }}
            >
              {showDeleteClass ? 'Cancel' : '🗑️ Delete Class'}
            </button>
          </div>
          
          {showCreateClass && (
            <div className="create-class-form">
              <h4>Create New Class</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Name</label>
                  <input 
                    type="text" 
                    value={newClass.name} 
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="e.g., BDS 1st Year, MDS Orthodontics"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <input 
                    type="text" 
                    value={newClass.section} 
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                    placeholder="e.g., A, B, Morning, Evening"
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input 
                  type="text" 
                  value={newClass.description} 
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="Additional details about the class"
                />
              </div>
              <button 
                type="button" 
                onClick={handleCreateClass}
                disabled={creatingClass}
                className="submit-btn"
              >
                {creatingClass ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          )}

          {showDeleteClass && (
            <div className="delete-class-form">
              <h4>Delete Class</h4>
              <div className="form-group">
                <label>Select Class to Delete</label>
                <select 
                  value={selectedClassToDelete} 
                  onChange={(e) => setSelectedClassToDelete(e.target.value)}
                  required
                >
                  <option value="">Choose a class to delete</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section} ({cls.student_count} students)
                    </option>
                  ))}
                </select>
              </div>
              <div className="delete-warning">
                <p><strong>⚠️ Warning:</strong> This action cannot be undone!</p>
                <p>Classes can only be deleted if they have no students or attendance sessions.</p>
              </div>
              <button 
                type="button" 
                onClick={handleDeleteClass}
                disabled={deletingClass || !selectedClassToDelete}
                className="delete-btn"
              >
                {deletingClass ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Photos (3–5 recommended)</label>
          <input type="file" accept="image/*" onChange={(e) => setStudentForm({ ...studentForm, photos: Array.from(e.target.files || []) })} multiple required />
          <small>Select varied angles/lighting for best results</small>
        </div>
        
        <button type="submit" className="submit-btn" disabled={registering}>
          {registering ? 'Registering…' : 'Register Student'}
        </button>
      </form>
    </div>
  );
}
