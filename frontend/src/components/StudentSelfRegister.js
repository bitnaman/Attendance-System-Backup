import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function StudentSelfRegister({ showMessage, onRegistrationSuccess }) {
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

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
      showMessage('Please fill in all required fields (Name, Roll Number, Class)', 'error');
      return;
    }

    if (!studentForm.photo) {
      showMessage('Please upload your photo for face recognition', 'error');
      return;
    }

    try {
      setRegistering(true);
      const formData = new FormData();
      formData.append('name', studentForm.name);
      formData.append('age', studentForm.age || '20');
      formData.append('roll_no', studentForm.rollNumber);
      formData.append('prn', studentForm.prn || `PRN${studentForm.rollNumber}`);
      formData.append('seat_no', studentForm.seat_no || `SEAT${studentForm.rollNumber}`);
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
      const response = await fetch(`${API_BASE}/student/self-register`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      if (response.ok) {
        // Store the name for success popup
        setRegisteredName(studentForm.name);
        setShowSuccessModal(true);
        
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
        
        if (onRegistrationSuccess) {
          onRegistrationSuccess();
        }
      } else {
        const errorData = await response.json();
        let errorMessage = 'Failed to register';
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
          } else if (typeof errorData.detail === 'object') {
            errorMessage = errorData.detail.msg || errorData.detail.message || 'Validation error';
          }
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error during self-registration:', error);
      showMessage('Failed to register. Please try again.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setRegisteredName('');
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '40px 50px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: 450,
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'scaleIn 0.5s ease-out'
            }}>
              <span style={{ fontSize: 40, color: 'white' }}>✓</span>
            </div>
            <h2 style={{ 
              color: '#1f2937', 
              marginBottom: 12,
              fontSize: '1.5rem',
              fontWeight: 600
            }}>
              Registration Successful! 🎉
            </h2>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.1rem',
              marginBottom: 24,
              lineHeight: 1.5
            }}>
              Registration for <strong style={{ color: '#10b981' }}>{registeredName}</strong> is successful!
            </p>
            <p style={{
              color: '#9ca3af',
              fontSize: '0.9rem',
              marginBottom: 24
            }}>
              Your face has been registered in the attendance system. You can now be recognized during attendance marking.
            </p>
            <button
              onClick={closeSuccessModal}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 40px',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <span style={{ fontSize: 32 }}>🎓</span>
        <div>
          <h3 style={{ margin: 0, color: '#166534', fontSize: '1.1rem' }}>Student Self-Registration</h3>
          <p style={{ margin: '4px 0 0 0', color: '#16a34a', fontSize: '0.9rem' }}>
            Register yourself in the facial recognition attendance system. Your photo will be used for automatic attendance marking.
          </p>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        border: '1px solid #e9ecef',
        padding: 24
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
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
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Roll Number */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
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
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Age */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Age *
              </label>
              <input
                type="number"
                value={studentForm.age}
                onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })}
                placeholder="Enter age"
                min="1"
                max="100"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* PRN */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                PRN *
              </label>
              <input
                type="text"
                value={studentForm.prn}
                onChange={(e) => setStudentForm({ ...studentForm, prn: e.target.value })}
                placeholder="Enter PRN"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Seat Number */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Seat Number *
              </label>
              <input
                type="text"
                value={studentForm.seat_no}
                onChange={(e) => setStudentForm({ ...studentForm, seat_no: e.target.value })}
                placeholder="Enter seat number"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Email
              </label>
              <input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                placeholder="Enter phone number"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Gender
              </label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Blood Group
              </label>
              <select
                value={studentForm.blood_group}
                onChange={(e) => setStudentForm({ ...studentForm, blood_group: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
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

            {/* Parent's Mobile */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Parent's Mobile
              </label>
              <input
                type="tel"
                value={studentForm.parents_mobile}
                onChange={(e) => setStudentForm({ ...studentForm, parents_mobile: e.target.value })}
                placeholder="Enter parent's mobile"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Class Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Class *
              </label>
              <select
                value={studentForm.class_id}
                onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
                required
                disabled={loadingClasses}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              >
                <option value="">
                  {loadingClasses ? 'Loading classes...' : 'Select Class'}
                </option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photo Upload */}
          <div style={{ marginTop: 24 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
              Your Photo * (Required for Face Recognition)
            </label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: 12,
              padding: 30,
              textAlign: 'center',
              backgroundColor: '#fafafa',
              transition: 'all 0.3s ease'
            }}>
              {previewImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: 200, 
                      maxHeight: 200, 
                      borderRadius: 12,
                      border: '3px solid #10b981',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                  <p style={{ color: '#666', marginBottom: 16 }}>
                    Upload a clear photo of your face
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    id="photo-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="photo-upload"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'inline-block'
                    }}
                  >
                    Choose Photo
                  </label>
                  <p style={{ color: '#999', fontSize: 12, marginTop: 12 }}>
                    Supported formats: JPG, PNG, JPEG
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              type="submit"
              disabled={registering}
              style={{
                backgroundColor: registering ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '14px 40px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: registering ? 'not-allowed' : 'pointer',
                minWidth: 200,
                transition: 'all 0.3s ease'
              }}
            >
              {registering ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Registering...
                </span>
              ) : (
                '🎓 Register Myself'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
