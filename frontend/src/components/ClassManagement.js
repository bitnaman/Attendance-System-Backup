import React, { useState, useEffect, useCallback } from 'react';

export default function ClassManagement({ showMessage }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showDeleteClass, setShowDeleteClass] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: '', description: '' });
  const [creatingClass, setCreatingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [selectedClassToDelete, setSelectedClassToDelete] = useState('');

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

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name || !newClass.section) {
      showMessage('Please fill in class name and section', 'error');
      return;
    }

    try {
      setCreatingClass(true);
      const formData = new FormData();
      formData.append('name', newClass.name);
      formData.append('section', newClass.section);
      formData.append('description', newClass.description);

      const response = await fetch(`${API_BASE}/student/classes`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showMessage('Class created successfully!', 'success');
        setNewClass({ name: '', section: '', description: '' });
        setShowCreateClass(false);
        loadClasses();
      } else {
        const errorData = await response.json();
        showMessage(errorData.detail || 'Failed to create class', 'error');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      showMessage('Failed to create class', 'error');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassToDelete) {
      showMessage('Please select a class to delete', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingClass(true);
      const response = await fetch(`${API_BASE}/student/classes/${selectedClassToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('Class deleted successfully!', 'success');
        setSelectedClassToDelete('');
        setShowDeleteClass(false);
        loadClasses();
      } else {
        const errorData = await response.json();
        showMessage(errorData.detail || 'Failed to delete class', 'error');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showMessage('Failed to delete class', 'error');
    } finally {
      setDeletingClass(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 24px 0', color: '#333' }}>Class Management</h3>
      
      {/* Class List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        border: '1px solid #e9ecef',
        padding: 20,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: '#495057' }}>Existing Classes</h4>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setShowCreateClass(true)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold'
              }}
            >
              ➕ Create New Class
            </button>
            <button 
              onClick={() => setShowDeleteClass(true)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold'
              }}
            >
              🗑️ Delete Class
            </button>
          </div>
        </div>

        {loadingClasses ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6c757d' }}>
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6c757d' }}>
            No classes found. Create your first class to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {classes.map(cls => (
              <div key={cls.id} style={{ 
                padding: 16, 
                backgroundColor: '#f8f9fa', 
                borderRadius: 8,
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', color: '#495057' }}>
                      {cls.name} - Section {cls.section}
                    </h5>
                    {cls.description && (
                      <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: 14 }}>
                        {cls.description}
                      </p>
                    )}
                    <div style={{ fontSize: 14, color: '#6c757d' }}>
                      <strong>Students:</strong> {cls.student_count || 0} | 
                      <strong> ID:</strong> {cls.id}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 12px', 
                    backgroundColor: '#e3f2fd', 
                    color: '#1976d2',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    Active
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateClass && (
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
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: 12, 
            padding: 24, 
            width: '90%', 
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#333' }}>Create New Class</h4>
            
            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g., BTech CSE, MBA Finance"
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Section *
                </label>
                <input
                  type="text"
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  placeholder="e.g., A, B, 1, 2"
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

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="Brief description of the class..."
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ced4da', 
                    borderRadius: 6,
                    fontSize: 16,
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateClass(false);
                    setNewClass({ name: '', section: '', description: '' });
                  }}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creatingClass}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: creatingClass ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    cursor: creatingClass ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                    fontWeight: 'bold'
                  }}
                >
                  {creatingClass ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Modal */}
      {showDeleteClass && (
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
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: 12, 
            padding: 24, 
            width: '90%', 
            maxWidth: 400
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#dc3545' }}>Delete Class</h4>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Select Class to Delete
              </label>
              <select
                value={selectedClassToDelete}
                onChange={(e) => setSelectedClassToDelete(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  border: '1px solid #ced4da', 
                  borderRadius: 6,
                  fontSize: 16
                }}
              >
                <option value="">Choose a class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section} ({cls.student_count || 0} students)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ 
              padding: 16, 
              backgroundColor: '#f8d7da', 
              border: '1px solid #f5c6cb',
              borderRadius: 6,
              marginBottom: 20
            }}>
              <strong style={{ color: '#721c24' }}>⚠️ Warning:</strong>
              <p style={{ margin: '8px 0 0 0', color: '#721c24', fontSize: 14 }}>
                Deleting a class will remove all associated students and attendance records. 
                This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteClass(false);
                  setSelectedClassToDelete('');
                }}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteClass}
                disabled={deletingClass || !selectedClassToDelete}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: deletingClass ? '#6c757d' : '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  cursor: deletingClass || !selectedClassToDelete ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                {deletingClass ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
