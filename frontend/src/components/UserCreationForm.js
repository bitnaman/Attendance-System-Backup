import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function UserCreationForm({ onUserCreated }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'teacher'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/users`, {
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

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully created ${data.role}: ${data.username}`);
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          role: 'teacher'
        });
        if (onUserCreated) {
          onUserCreated();
        }
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin':
        return '👑';
      case 'teacher':
        return '👨‍🏫';
      default:
        return '👤';
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'superadmin':
        return 'Full system access, can create users and manage all features';
      case 'teacher':
        return 'Can mark attendance, manage students, and view analytics';
      default:
        return '';
    }
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{
          margin: 0,
          color: '#2c3e50',
          fontSize: '1.4rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          ➕ Create New User
        </h3>
        <p style={{
          margin: 0,
          color: '#7f8c8d',
          fontSize: '0.95rem'
        }}>
          Add new teachers or administrators to the system
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Username Field */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            👤 Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Enter username (letters, numbers, underscores only)"
            style={{
              width: '100%',
              padding: '1rem',
              border: `2px solid ${errors.username ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)'}`,
              borderRadius: '12px',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              outline: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = errors.username ? '#e74c3c' : '#3498db';
              e.target.style.boxShadow = `0 0 0 3px ${errors.username ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)'}`;
              e.target.style.backgroundColor = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.username ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)';
              e.target.style.boxShadow = 'none';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            }}
          />
          {errors.username && (
            <div style={{
              marginTop: '0.5rem',
              color: '#e74c3c',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span>⚠️</span>
              {errors.username}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            🔒 Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password (minimum 6 characters)"
            style={{
              width: '100%',
              padding: '1rem',
              border: `2px solid ${errors.password ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)'}`,
              borderRadius: '12px',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              outline: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = errors.password ? '#e74c3c' : '#3498db';
              e.target.style.boxShadow = `0 0 0 3px ${errors.password ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)'}`;
              e.target.style.backgroundColor = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.password ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)';
              e.target.style.boxShadow = 'none';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            }}
          />
          {errors.password && (
            <div style={{
              marginTop: '0.5rem',
              color: '#e74c3c',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span>⚠️</span>
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            🔒 Confirm Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            style={{
              width: '100%',
              padding: '1rem',
              border: `2px solid ${errors.confirmPassword ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)'}`,
              borderRadius: '12px',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              outline: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = errors.confirmPassword ? '#e74c3c' : '#3498db';
              e.target.style.boxShadow = `0 0 0 3px ${errors.confirmPassword ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)'}`;
              e.target.style.backgroundColor = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.confirmPassword ? '#e74c3c' : 'rgba(44, 62, 80, 0.1)';
              e.target.style.boxShadow = 'none';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            }}
          />
          {errors.confirmPassword && (
            <div style={{
              marginTop: '0.5rem',
              color: '#e74c3c',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span>⚠️</span>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Role Selection */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            🎭 User Role
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['teacher', 'superadmin'].map((role) => (
              <label
                key={role}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: `2px solid ${formData.role === role ? '#3498db' : 'rgba(44, 62, 80, 0.1)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: formData.role === role ? 'rgba(52, 152, 219, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (formData.role !== role) {
                    e.target.style.borderColor = '#3498db';
                    e.target.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (formData.role !== role) {
                    e.target.style.borderColor = 'rgba(44, 62, 80, 0.1)';
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={formData.role === role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '1.5rem' }}>
                  {getRoleIcon(role)}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: formData.role === role ? '#3498db' : '#2c3e50',
                  textAlign: 'center'
                }}>
                  {role === 'superadmin' ? 'Super Admin' : 'Teacher'}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#7f8c8d',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {getRoleDescription(role)}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            padding: '1rem',
            backgroundColor: message.includes('✅') 
              ? 'rgba(39, 174, 96, 0.1)' 
              : 'rgba(231, 76, 60, 0.1)',
            border: `1px solid ${message.includes('✅') 
              ? 'rgba(39, 174, 96, 0.2)' 
              : 'rgba(231, 76, 60, 0.2)'}`,
            borderRadius: '8px',
            color: message.includes('✅') ? '#27ae60' : '#e74c3c',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading 
              ? 'linear-gradient(135deg, #95a5a6, #7f8c8d)' 
              : 'linear-gradient(135deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(52, 152, 219, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 35px rgba(52, 152, 219, 0.4)';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.3)';
            }
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Creating User...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span>🚀</span>
              Create User
            </span>
          )}
        </button>
      </form>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
