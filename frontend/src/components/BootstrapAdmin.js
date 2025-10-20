import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function BootstrapAdmin() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/bootstrap-superadmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to create superadmin');
      }
      
      const userData = await res.json();
      setSuccess(true);
      
      // Auto-login after successful creation
      setTimeout(async () => {
        try {
          const body = new URLSearchParams();
          body.append('username', username);
          body.append('password', password);
          const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          
          if (loginRes.ok) {
            const tokenData = await loginRes.json();
            const meRes = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const me = meRes.ok ? await meRes.json() : null;
            login(tokenData.access_token, me);
          }
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
        }
      }, 2000);
      
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        maxWidth: 400, 
        margin: '80px auto', 
        padding: 24, 
        border: '1px solid #28a745', 
        borderRadius: 8,
        backgroundColor: '#d4edda',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: '#155724', margin: '0 0 16px 0' }}>Super Admin Created!</h3>
        <p style={{ color: '#155724', margin: '0 0 16px 0' }}>
          The super administrator account has been created successfully.
        </p>
        <p style={{ color: '#155724', margin: 0 }}>
          You will be automatically logged in...
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 400, 
      margin: '80px auto', 
      padding: 24, 
      border: '1px solid #007bff', 
      borderRadius: 8,
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👑</div>
        <h3 style={{ color: '#007bff', margin: '0 0 8px 0' }}>Create Super Administrator</h3>
        <p style={{ color: '#6c757d', margin: 0, fontSize: 14 }}>
          This is a one-time setup to create the first administrator account.
        </p>
      </div>
      
      <form onSubmit={submit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Username</label>
          <input 
            style={{ 
              width: '100%', 
              padding: 12, 
              border: '1px solid #ced4da', 
              borderRadius: 4,
              fontSize: 16
            }} 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter admin username"
            required
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Password</label>
          <input 
            style={{ 
              width: '100%', 
              padding: 12, 
              border: '1px solid #ced4da', 
              borderRadius: 4,
              fontSize: 16
            }} 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (min 6 characters)"
            required
          />
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Confirm Password</label>
          <input 
            style={{ 
              width: '100%', 
              padding: 12, 
              border: '1px solid #ced4da', 
              borderRadius: 4,
              fontSize: 16
            }} 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
          />
        </div>
        
        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginBottom: 16, 
            padding: 12,
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: 4
          }}>
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: 12, 
            backgroundColor: loading ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Super Administrator'}
        </button>
      </form>
      
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        backgroundColor: '#e3f2fd', 
        borderRadius: 4,
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1976d2', fontSize: 14 }}>Super Admin Privileges:</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#1976d2', fontSize: 13 }}>
          <li>Create and manage teacher accounts</li>
          <li>Full system access</li>
          <li>System backup and restore</li>
          <li>All teacher capabilities</li>
        </ul>
      </div>
    </div>
  );
}
