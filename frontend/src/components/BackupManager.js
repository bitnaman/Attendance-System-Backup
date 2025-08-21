import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

async function apiRequest(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'An unknown error occurred' }));
    throw new Error(errorData.detail);
  }
  return res.json();
}

const BackupManager = ({ showMessage }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/student/backups');
      setBackups(data.backups || []);
    } catch (error) {
      showMessage(`Error fetching backups: ${error.message}`, 'error');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const data = await apiRequest('/student/backup', { method: 'POST' });
      showMessage(data.message || 'Backup created successfully!', 'success');
      fetchBackups(); // Refresh the list
    } catch (error) {
      showMessage(`Error creating backup: ${error.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup_file', file);

      const response = await fetch(`${API_BASE}/student/restore`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Restore failed' }));
        throw new Error(errorData.detail);
      }

      const data = await response.json();
      showMessage(data.message || 'Backup restored successfully!', 'success');
    } catch (error) {
      showMessage(`Error restoring backup: ${error.message}`, 'error');
    } finally {
      setRestoring(false);
      event.target.value = ''; // Reset file input
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Fetch backups on component mount
  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <div className="backup-manager">
      <div className="section-header">
        <div className="section-icon">💾</div>
        <div className="section-title">
          <h2>Backup & Restore</h2>
          <p>Create backups of your attendance data and restore from previous backups</p>
        </div>
      </div>

      <div className="backup-actions" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <button 
          onClick={createBackup} 
          disabled={creating} 
          className="modern-btn primary"
          style={{
            padding: '0.75rem 1.5rem',
            background: creating ? '#94a3b8' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: creating ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {creating ? '⏳ Creating...' : '💾 Create New Backup'}
        </button>

        <div style={{ position: 'relative' }}>
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            disabled={restoring}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: restoring ? 'not-allowed' : 'pointer'
            }}
            id="restore-input"
          />
          <label 
            htmlFor="restore-input"
            style={{
              padding: '0.75rem 1.5rem',
              background: restoring ? '#94a3b8' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: restoring ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {restoring ? '⏳ Restoring...' : '📂 Restore from File'}
          </label>
        </div>

        <button 
          onClick={fetchBackups} 
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading ? '#94a3b8' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      <div className="backup-list" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Available Backups</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div>⏳ Loading backups...</div>
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div>📁 No backups found</div>
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Create your first backup using the button above
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {backups.map((backup, index) => (
              <div 
                key={index} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(241, 245, 249, 0.7)',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                    📄 {backup.filename}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {formatDate(backup.created)} • {formatFileSize(backup.size)} • {backup.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a
                    href={`${API_BASE}/static/backups/${backup.filename}`}
                    download
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}
                  >
                    ⬇️ Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(239, 246, 255, 0.7)',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#1e40af'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>💡 Backup Information:</div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Backups include all students, classes, and attendance records</li>
          <li>Files are saved in JSON format for easy portability</li>
          <li>Restore feature allows importing data from backup files</li>
          <li>Regular backups ensure your data is always safe</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupManager;
