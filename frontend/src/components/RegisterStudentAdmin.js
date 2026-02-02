import React, { useState, useEffect, useCallback } from 'react';

export default function RegisterStudentAdmin({ showMessage }) {
  const [studentForm, setStudentForm] = useState({
    name: '',
    age: '',
    rollNumber: '',
    prn: '',
    seat_no: '',
    email: '',
    phone: '',
    gender: '',
    blood_group: '',
    parents_mobile: '',
    class_id: '',
    photo: null
  });
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  const loadClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch(`${API_BASE}/student/classes`);
      if (response.status === 401) {
        showMessage?.('Session expired. Please log in again.', 'error');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  }, [API_BASE, showMessage]);

  // Load available classes
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStudentForm({ ...studentForm, photo: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setStudentForm({ ...studentForm, photo: null });
    setPreviewImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!studentForm.name || !studentForm.rollNumber || !studentForm.class_id) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    try {
      setRegistering(true);
      const formData = new FormData();
      formData.append('name', studentForm.name);
      formData.append('age', studentForm.age || '20'); // Default age
      formData.append('roll_no', studentForm.rollNumber);
      formData.append('prn', studentForm.prn || `PRN${studentForm.rollNumber}`); // Generate PRN if not provided
      formData.append('seat_no', studentForm.seat_no || `SEAT${studentForm.rollNumber}`); // Generate seat no if not provided
      formData.append('email', studentForm.email);
      formData.append('phone', studentForm.phone);
      if (studentForm.gender) formData.append('gender', studentForm.gender);
      if (studentForm.blood_group) formData.append('blood_group', studentForm.blood_group);
      if (studentForm.parents_mobile) formData.append('parents_mobile', studentForm.parents_mobile);
      formData.append('class_id', studentForm.class_id);
      
      if (studentForm.photo) {
        formData.append('image', studentForm.photo);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/student/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      if (response.ok) {
        showMessage('Student registered successfully!', 'success');
        // Reset form
        setStudentForm({
          name: '',
          age: '',
          rollNumber: '',
          prn: '',
          seat_no: '',
          email: '',
          phone: '',
          gender: '',
          blood_group: '',
          parents_mobile: '',
          class_id: '',
          photo: null
        });
        setPreviewImage(null);
      } else {
        const errorData = await response.json();
        // Handle validation errors that might be objects
        let errorMessage = 'Failed to register student';
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // Handle validation error array
            errorMessage = errorData.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
          } else if (typeof errorData.detail === 'object') {
            errorMessage = errorData.detail.msg || errorData.detail.message || 'Validation error';
          }
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error registering student:', error);
      showMessage('Failed to register student', 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 24px 0', color: '#333' }}>Register New Student</h3>
      
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        border: '1px solid #e9ecef',
        padding: 24
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Student Name *
              </label>
              <input
                type="text"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Enter full name"
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Roll Number *
              </label>
              <input
                type="text"
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                placeholder="Enter roll number"
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Age *
              </label>
              <input
                type="number"
                value={studentForm.age}
                onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })}
                placeholder="Enter age"
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                PRN *
              </label>
              <input
                type="text"
                value={studentForm.prn}
                onChange={(e) => setStudentForm({ ...studentForm, prn: e.target.value })}
                placeholder="Enter PRN"
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Seat Number *
              </label>
              <input
                type="text"
                value={studentForm.seat_no}
                onChange={(e) => setStudentForm({ ...studentForm, seat_no: e.target.value })}
                placeholder="Enter seat number"
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Email
              </label>
              <input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="Enter email address"
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                placeholder="Enter phone number"
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Gender
              </label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16,
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Blood Group
              </label>
              <select
                value={studentForm.blood_group}
                onChange={(e) => setStudentForm({ ...studentForm, blood_group: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16,
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Parent/Guardian Mobile
              </label>
              <input
                type="tel"
                value={studentForm.parents_mobile}
                onChange={(e) => setStudentForm({ ...studentForm, parents_mobile: e.target.value })}
                placeholder="Enter parent's mobile"
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              Select Class *
            </label>
            {loadingClasses ? (
              <select disabled style={{ 
                width: '100%', 
                padding: 12, 
                border: '1px solid #ced4da', 
                borderRadius: 6,
                fontSize: 16
              }}>
                <option>Loading classes...</option>
              </select>
            ) : (
              <select 
                value={studentForm.class_id} 
                onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })} 
                required
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              >
                <option value="">Choose class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section} ({cls.student_count || 0} students)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              Student Photo
            </label>
            <div style={{ 
              border: '2px dashed #ced4da', 
              borderRadius: 8, 
              padding: 20, 
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="student-photo-upload"
              />
              <label htmlFor="student-photo-upload" style={{ cursor: 'pointer' }}>
                {previewImage ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: 200, 
                        maxHeight: 200, 
                        borderRadius: 8,
                        border: '1px solid #ced4da'
                      }} 
                    />
                    <button 
                      type="button" 
                      onClick={clearImage}
                      style={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    <div>
                      <strong>Click to upload student photo</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
                        Recommended: Clear face photo for better recognition
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button 
              type="submit" 
              disabled={registering}
              style={{ 
                padding: '12px 32px', 
                backgroundColor: registering ? '#6c757d' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                cursor: registering ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              {registering ? '⏳ Registering...' : '✅ Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
