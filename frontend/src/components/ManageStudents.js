import React, { useState, useEffect } from 'react';
import StudentCard from './StudentCard';
import StudentDetail from './StudentDetail';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function ManageStudents({
  students,
  onEdit,
  onDelete,
  onToggle,
  onUpgradeEmbeddings,
  userRole
}) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(12);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch classes for filtering
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/classes`, {
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

  // Filter students by selected class, division, and search term
  const filteredStudents = students.filter(student => {
    const matchesClass = !selectedClass || student.class_id === parseInt(selectedClass);
    const matchesDivision = !selectedDivision || student.class_section === selectedDivision;
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.prn.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClass && matchesDivision && matchesSearch;
  });

  // Get unique divisions for the selected class
  const availableDivisions = selectedClass 
    ? [...new Set(students
        .filter(student => student.class_id === parseInt(selectedClass))
        .map(student => student.class_section)
        .filter(Boolean))]
    : [];

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedDivision, searchTerm]);

  return (
    <div className="manage-students-tab">
      <h2 className="section-title">Manage Students</h2>
      
      {/* YouTube-style Search and Filter Bar */}
      <div className="search-filter-bar">
        {/* Search Bar */}
        <div className="search-container">
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        {/* Filter Toggle Button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
        >
          <span>🔧</span>
          <span className="filter-text">Filters</span>
          <span className="filter-arrow">{showFilters ? '▲' : '▼'}</span>
        </button>

        {/* Results Count */}
        <div className="results-count">
          {filteredStudents.length} students
          {filteredStudents.length !== students.length && (
            <span className="total-count"> of {students.length}</span>
          )}
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          borderRadius: '12px',
          border: '1px solid rgba(44, 62, 80, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1rem', fontWeight: '600' }}>
              🔧 Advanced Filters
            </h3>
            <button 
              onClick={() => {
                setSelectedClass('');
                setSelectedDivision('');
              }}
              style={{ 
                padding: '0.5rem 1rem', 
                border: '1px solid rgba(44, 62, 80, 0.2)', 
                backgroundColor: 'white', 
                color: '#2c3e50', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              Clear All
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>
                🏫 Class
              </label>
              <select 
                value={selectedClass} 
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedDivision('');
                }}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid rgba(44, 62, 80, 0.1)', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2c3e50';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(44, 62, 80, 0.1)';
                }}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - Section {cls.section}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>
                📚 Division
              </label>
              <select 
                value={selectedDivision} 
                onChange={(e) => setSelectedDivision(e.target.value)}
                disabled={!selectedClass || availableDivisions.length === 0}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid rgba(44, 62, 80, 0.1)', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  opacity: (!selectedClass || availableDivisions.length === 0) ? 0.6 : 1
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2c3e50';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(44, 62, 80, 0.1)';
                }}
              >
                <option value="">All Divisions</option>
                {availableDivisions.map(division => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredStudents.length === 0 ? (
        <div className="empty-state" style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#6c757d',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>No Students Found</h3>
          <p style={{ margin: '0 0 1rem 0' }}>
            {searchTerm || selectedClass || selectedDivision 
              ? 'No students match your current filters. Try adjusting your search criteria.'
              : 'No students registered yet.'
            }
          </p>
          {!searchTerm && !selectedClass && !selectedDivision && (
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Register the first student to get started!</p>
          )}
        </div>
      ) : (
        <>
          <div className="students-grid">
            {currentStudents.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onViewDetails={setSelectedStudentId}
                onUpgradeEmbeddings={onUpgradeEmbeddings}
                userRole={userRole}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '1rem', 
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: '0.5rem 1rem', 
                  border: '1px solid #ced4da', 
                  backgroundColor: currentPage === 1 ? '#e9ecef' : 'white', 
                  color: currentPage === 1 ? '#6c757d' : '#495057', 
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      border: '1px solid #ced4da', 
                      backgroundColor: currentPage === page ? '#007bff' : 'white', 
                      color: currentPage === page ? 'white' : '#495057', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '2.5rem'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: '0.5rem 1rem', 
                  border: '1px solid #ced4da', 
                  backgroundColor: currentPage === totalPages ? '#e9ecef' : 'white', 
                  color: currentPage === totalPages ? '#6c757d' : '#495057', 
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selectedStudentId && (
        <StudentDetail
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}
