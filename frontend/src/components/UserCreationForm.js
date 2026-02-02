import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import '../styles/user-profile.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function UserCreationForm({ onUserCreated }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'teacher'
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors({});

    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      
      if (profilePhoto) {
        // Use FormData for photo upload
        const formDataObj = new FormData();
        formDataObj.append('username', formData.username);
        formDataObj.append('password', formData.password);
        formDataObj.append('role', formData.role);
        formDataObj.append('photo', profilePhoto);
        
        response = await fetch(`${API_BASE}/auth/users/with-photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataObj,
        });
      } else {
        // Use JSON for no photo
        response = await fetch(`${API_BASE}/auth/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            role: formData.role
          }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully created ${data.role}: ${data.username}`);
        setFormData({ username: '', password: '', confirmPassword: '', role: 'teacher' });
        clearPhoto();
        if (onUserCreated) onUserCreated();
      } else {
        setMessage(`❌ Error: ${data.detail || 'Failed to create user'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const roles = [
    { id: 'teacher', icon: '👨‍🏫', title: 'Teacher', desc: 'Mark attendance, manage students, view analytics' },
    { id: 'superadmin', icon: '👑', title: 'Super Admin', desc: 'Full system access, user management' },
    { id: 'student', icon: '🎓', title: 'Student', desc: 'Self-registration, view profile only' }
  ];

  return (
    <div className="user-form-card">
      <div className="user-form-header">
        <h3>➕ Create New User</h3>
        <p>Add new teachers or administrators</p>
      </div>

      <form onSubmit={handleSubmit} className="user-form">
        {/* Profile Photo */}
        <div className="form-field">
          <label className="form-label">📷 Profile Photo (Optional)</label>
          <div className="photo-upload-section">
            <div className="photo-preview-container">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="photo-preview" />
              ) : (
                <div className="photo-preview-placeholder">👤</div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  ref={fileInputRef}
                  className="photo-upload-input"
                  id="profile-photo-input"
                />
                <label htmlFor="profile-photo-input" className="photo-upload-btn">
                  📤 {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photoPreview && (
                  <button type="button" onClick={clearPhoto} className="photo-remove-btn" style={{ marginLeft: 8 }}>
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="form-field">
          <label className="form-label">👤 Username</label>
          <input
            type="text"
            className={`form-input ${errors.username ? 'error' : ''}`}
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Enter username (letters, numbers, underscores)"
          />
          {errors.username && (
            <div className="form-error">
              <span>⚠️</span>
              {errors.username}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="form-field">
          <label className="form-label">🔒 Password</label>
          <input
            type="password"
            className={`form-input ${errors.password ? 'error' : ''}`}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password (min 6 characters)"
          />
          {errors.password && (
            <div className="form-error">
              <span>⚠️</span>
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-field">
          <label className="form-label">🔒 Confirm Password</label>
          <input
            type="password"
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <div className="form-error">
              <span>⚠️</span>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Role Selection */}
        <div className="form-field">
          <label className="form-label">🎭 User Role</label>
          <div className="role-selector">
            {roles.map((role) => (
              <label
                key={role.id}
                className={`role-option ${formData.role === role.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  checked={formData.role === role.id}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                />
                <span className="role-icon">{role.icon}</span>
                <div>
                  <div className="role-title">{role.title}</div>
                  <div className="role-desc">{role.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`form-message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16 }} />
              Creating User...
            </>
          ) : (
            <>
              🚀 Create User
            </>
          )}
        </button>
      </form>
    </div>
  );
}
