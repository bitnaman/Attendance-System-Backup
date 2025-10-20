import React, { useState, useEffect } from 'react';
import '../styles/forms.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function SubjectManagement({ showMessage }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    class_id: ''
  });
  const [editingSubject, setEditingSubject] = useState(null);

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_BASE}/student/classes`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      showMessage('Failed to load classes', 'error');
    }
  };

  const loadSubjects = async (classId = null) => {
    try {
      setLoading(true);
      const url = classId 
        ? `${API_BASE}/subjects/class/${classId}`
        : `${API_BASE}/subjects/`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
      showMessage('Failed to load subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassFilter = (classId) => {
    setSelectedClass(classId);
    if (classId) {
      loadSubjects(classId);
    } else {
      loadSubjects();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.class_id) {
      showMessage('Please fill in required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        credits: formData.credits ? parseInt(formData.credits) : null,
        class_id: parseInt(formData.class_id)
      };

      let response;
      if (editingSubject) {
        // Update existing subject
        response = await fetch(`${API_BASE}/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new subject
        response = await fetch(`${API_BASE}/subjects/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        showMessage(
          editingSubject ? 'Subject updated successfully!' : 'Subject created successfully!',
          'success'
        );
        resetForm();
        loadSubjects(selectedClass || null);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to save subject', 'error');
      }
    } catch (error) {
      console.error('Failed to save subject:', error);
      showMessage('Failed to save subject', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      credits: subject.credits || '',
      class_id: subject.class_id.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/subjects/${subjectId}`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        showMessage('Subject deleted successfully!', 'success');
        loadSubjects(selectedClass || null);
      } else {
        showMessage('Failed to delete subject', 'error');
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
      showMessage('Failed to delete subject', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      credits: '',
      class_id: ''
    });
    setEditingSubject(null);
    setShowForm(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📚 Subject Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {showForm ? '❌ Cancel' : '➕ Add Subject'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid #dee2e6'
        }}>
          <h3>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  placeholder="e.g., Mathematics, Physics"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  placeholder="e.g., MATH101, PHY201"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                  Class *
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                  Credits
                </label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  placeholder="e.g., 3, 4"
                  min="0"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  rows="3"
                  placeholder="Subject description (optional)"
                />
              </div>
            </div>

            <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : (editingSubject ? 'Update Subject' : 'Add Subject')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 10, fontWeight: 'bold' }}>Filter by Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => handleClassFilter(e.target.value)}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
        >
          <option value="">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - {cls.section}
            </option>
          ))}
        </select>
      </div>

      {/* Subjects List */}
      <div>
        <h3>Subjects ({subjects.length})</h3>
        {loading && <p>Loading subjects...</p>}
        {!loading && subjects.length === 0 && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No subjects found. Click "Add Subject" to create one.
          </p>
        )}
        {!loading && subjects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 15 }}>
            {subjects.map(subject => (
              <div
                key={subject.id}
                style={{
                  backgroundColor: 'white',
                  padding: 15,
                  borderRadius: 8,
                  border: '1px solid #dee2e6',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#007bff' }}>
                    {subject.name}
                    {subject.code && <span style={{ color: '#666', fontSize: '0.9em' }}> ({subject.code})</span>}
                  </h4>
                  <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                    📖 {subject.class_name} - {subject.class_section}
                  </p>
                  {subject.credits && (
                    <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                      ⭐ {subject.credits} Credits
                    </p>
                  )}
                  {subject.description && (
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.9em', color: '#555' }}>
                      {subject.description}
                    </p>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    onClick={() => handleEdit(subject)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#ffc107',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

