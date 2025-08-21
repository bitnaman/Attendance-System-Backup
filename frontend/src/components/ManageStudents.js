import React, { useState, useEffect } from 'react';
import StudentCard from './StudentCard';
import EditStudentForm from './EditStudentForm';

export default function ManageStudents({
  students,
  onEdit,
  onDelete,
  onToggle,
  editingStudent,
  editForm,
  setEditForm,
  onUpdate,
  onCancel,
  updating
}) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  // Fetch classes for filtering
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

  // Filter students by selected class
  const filteredStudents = selectedClass 
    ? students.filter(student => student.class_id === parseInt(selectedClass))
    : students;

  return (
    <div className="manage-students-tab">
      <h2>Manage Students</h2>
      
      {/* Class Filter */}
      <div className="filter-section" style={{ marginBottom: '2rem' }}>
        <label htmlFor="class-filter">Filter by Class:</label>
        <select 
          id="class-filter"
          value={selectedClass} 
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{ marginLeft: '1rem', padding: '0.5rem' }}
        >
          <option value="">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - Section {cls.section}
            </option>
          ))}
        </select>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="empty-state">
          <p>{selectedClass ? 'No students found in the selected class.' : 'No students registered yet.'}</p>
          {!selectedClass && <p>Register the first student to get started!</p>}
        </div>
      ) : (
        <div className="students-grid">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {editingStudent !== null && (
        <EditStudentForm
          editForm={editForm}
          setEditForm={setEditForm}
          onUpdate={onUpdate}
          onCancel={onCancel}
          updating={updating}
        />
      )}
    </div>
  );
}
