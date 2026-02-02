import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentCardNew, StudentFilters, EmptyState, Pagination, StudentDetailsModal } from './students';
import './students/styles/manage-students-new.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * ManageStudentsNew - Redesigned Manage Students Component
 * Modern, responsive, mobile-friendly student management
 */
export default function ManageStudentsNew({
  students,
  onEdit,
  onDelete,
  onToggle,
  onUpgradeEmbeddings,
  userRole
}) {
  // Classes for filtering
  const [classes, setClasses] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    classId: '',
    division: '',
    searchTerm: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // View mode (grid or list)
  const [viewMode, setViewMode] = useState('grid');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(12);
  
  // Mobile filter panel state
  const [showFilters, setShowFilters] = useState(false);
  
  // Student detail modal
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Fetch classes on mount
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/student/classes`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.status === 401) {
        console.warn('Session expired');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Get available divisions for selected class
  const availableDivisions = useMemo(() => {
    if (!filters.classId) return [];
    return [...new Set(
      students
        .filter(s => s.class_id === parseInt(filters.classId))
        .map(s => s.class_section)
        .filter(Boolean)
    )].sort();
  }, [students, filters.classId]);

  // Filter and sort students
  const processedStudents = useMemo(() => {
    let result = [...students];
    
    // Filter by class
    if (filters.classId) {
      result = result.filter(s => s.class_id === parseInt(filters.classId));
    }
    
    // Filter by division
    if (filters.division) {
      result = result.filter(s => s.class_section === filters.division);
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.roll_no?.toLowerCase().includes(term) ||
        s.prn?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.phone?.includes(term)
      );
    }
    
    // Filter by status
    if (filters.status === 'active') {
      result = result.filter(s => s.is_active);
    } else if (filters.status === 'inactive') {
      result = result.filter(s => !s.is_active);
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (filters.sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'roll_no':
          aVal = a.roll_no || '';
          bVal = b.roll_no || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
        case 'class':
          aVal = (a.class_name || '').toLowerCase();
          bVal = (b.class_name || '').toLowerCase();
          break;
        default:
          aVal = a[filters.sortBy] || '';
          bVal = b[filters.sortBy] || '';
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [students, filters]);

  // Pagination calculations
  const totalPages = Math.ceil(processedStudents.length / studentsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    return processedStudents.slice(startIndex, startIndex + studentsPerPage);
  }, [processedStudents, currentPage, studentsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Update filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      classId: '',
      division: '',
      searchTerm: '',
      status: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  }, []);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return filters.classId || filters.division || filters.searchTerm || filters.status;
  }, [filters]);

  // Stats summary
  const summaryStats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.is_active).length;
    const inactive = total - active;
    const withAI = students.filter(s => s.has_enhanced_embeddings).length;
    
    return { total, active, inactive, withAI };
  }, [students]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to top of students list
    document.querySelector('.ms-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Handle view details
  const handleViewDetails = useCallback((studentId) => {
    setSelectedStudentId(studentId);
  }, []);

  // Handle close detail modal
  const handleCloseDetail = useCallback(() => {
    setSelectedStudentId(null);
  }, []);

  return (
    <div className="ms-container">
      {/* Header Section */}
      <header className="ms-header">
        <div className="ms-header-content">
          <div className="ms-title-section">
            <h1 className="ms-title">
              <span className="ms-title-icon">👥</span>
              Manage Students
            </h1>
            <p className="ms-subtitle">
              View and manage all registered students
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="ms-quick-stats">
            <div className="ms-stat-pill primary">
              <span className="ms-stat-value">{summaryStats.total}</span>
              <span className="ms-stat-label">Total</span>
            </div>
            <div className="ms-stat-pill success">
              <span className="ms-stat-value">{summaryStats.active}</span>
              <span className="ms-stat-label">Active</span>
            </div>
            <div className="ms-stat-pill warning">
              <span className="ms-stat-value">{summaryStats.inactive}</span>
              <span className="ms-stat-label">Inactive</span>
            </div>
          </div>
        </div>
        
        {/* Mobile Filter Toggle */}
        <button 
          className="ms-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="student-filters"
        >
          <span>⚙️</span>
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="ms-filter-badge">
              {Object.values(filters).filter(v => v && v !== 'name' && v !== 'asc').length}
            </span>
          )}
        </button>
      </header>

      {/* Filters Panel */}
      <StudentFilters
        classes={classes}
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        availableDivisions={availableDivisions}
      />

      {/* Main Content */}
      <main className="ms-main">
        {processedStudents.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            totalStudents={students.length}
          />
        ) : (
          <>
            {/* Results Header */}
            <div className="ms-results-header">
              <div className="ms-results-info">
                <span className="ms-results-count">
                  Showing <strong>{paginatedStudents.length}</strong> of <strong>{processedStudents.length}</strong> students
                  {processedStudents.length !== students.length && (
                    <> (filtered from {students.length} total)</>
                  )}
                </span>
              </div>
              
              {/* View Mode Toggle */}
              <div className="ms-view-toggle">
                <button 
                  className={`ms-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button 
                  className={`ms-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                  aria-pressed={viewMode === 'list'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Students Grid/List */}
            <div className={`ms-students ms-students--${viewMode}`}>
              {paginatedStudents.map(student => (
                <StudentCardNew
                  key={student.id}
                  student={student}
                  viewMode={viewMode}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggle={onToggle}
                  onViewDetails={handleViewDetails}
                  onUpgradeEmbeddings={onUpgradeEmbeddings}
                  userRole={userRole}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <StudentDetailsModal
          studentId={selectedStudentId}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
