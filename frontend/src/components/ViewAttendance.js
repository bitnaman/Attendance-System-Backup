import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SessionCardNew from './attendance/SessionCardNew';
import SessionDetailsModal from './attendance/SessionDetailsModal';
import FiltersPanel from './attendance/FiltersPanel';
import EmptyState from './attendance/EmptyState';
import './attendance/styles/view-attendance.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

/**
 * ViewAttendance - Redesigned View Attendance Component
 * Modern, responsive, mobile-friendly attendance viewer
 */
export default function ViewAttendance({
  loading,
  sessions,
  stats,
  selectedSession,
  onSelectSession,
  records,
  onRefresh
}) {
  // Classes for filtering
  const [classes, setClasses] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    classId: '',
    searchTerm: '',
    dateFilter: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  // View mode
  const [viewMode, setViewMode] = useState('grid');
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  
  // Mobile filter panel state
  const [showFilters, setShowFilters] = useState(false);

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

  // Calculate attendance rate utility
  const calculateAttendanceRate = useCallback((present, total) => {
    if (!total || total === 0) return 0;
    return Math.round((present / total) * 100);
  }, []);

  // Format date utility
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    };
  }, []);

  // Filter and sort sessions
  const processedSessions = useMemo(() => {
    let result = [...sessions];
    
    // Filter by class
    if (filters.classId) {
      result = result.filter(s => s.class_id === parseInt(filters.classId));
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(s => 
        s.session_name.toLowerCase().includes(term) ||
        (s.class_name && s.class_name.toLowerCase().includes(term))
      );
    }
    
    // Filter by date
    if (filters.dateFilter) {
      result = result.filter(s => {
        const sessionDate = new Date(s.date || s.created_at).toDateString();
        const filterDate = new Date(filters.dateFilter).toDateString();
        return sessionDate === filterDate;
      });
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (filters.sortBy) {
        case 'date':
          aVal = new Date(a.date || a.created_at);
          bVal = new Date(b.date || b.created_at);
          break;
        case 'name':
          aVal = a.session_name.toLowerCase();
          bVal = b.session_name.toLowerCase();
          break;
        case 'attendance':
          aVal = calculateAttendanceRate(a.total_present, a.total_students || a.total_detected);
          bVal = calculateAttendanceRate(b.total_present, b.total_students || b.total_detected);
          break;
        case 'class':
          aVal = (a.class_name || '').toLowerCase();
          bVal = (b.class_name || '').toLowerCase();
          break;
        default:
          aVal = a[filters.sortBy];
          bVal = b[filters.sortBy];
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [sessions, filters, calculateAttendanceRate]);

  // Handle session selection
  const handleSelectSession = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    setSelectedSessionData(session);
    setShowDetailsModal(true);
    onSelectSession(sessionId);
  }, [sessions, onSelectSession]);

  // Handle closing modal
  const handleCloseModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedSessionData(null);
    onSelectSession(null);
  }, [onSelectSession]);

  // Update filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      classId: '',
      searchTerm: '',
      dateFilter: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  }, []);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return filters.classId || filters.searchTerm || filters.dateFilter;
  }, [filters]);

  // Get session records for modal
  const sessionRecords = useMemo(() => {
    if (!selectedSessionData) return [];
    return records.filter(r => r.session_id === selectedSessionData.id);
  }, [selectedSessionData, records]);

  // Stats summary
  const summaryStats = useMemo(() => {
    const totalSessions = processedSessions.length;
    const avgAttendance = totalSessions > 0 
      ? Math.round(
          processedSessions.reduce((sum, s) => 
            sum + calculateAttendanceRate(s.total_present, s.total_students || s.total_detected), 0
          ) / totalSessions
        )
      : 0;
    const totalPresent = processedSessions.reduce((sum, s) => sum + (s.total_present || 0), 0);
    const totalStudents = processedSessions.reduce((sum, s) => sum + (s.total_students || s.total_detected || 0), 0);
    
    return { totalSessions, avgAttendance, totalPresent, totalStudents };
  }, [processedSessions, calculateAttendanceRate]);

  return (
    <div className="va-container">
      {/* Header Section */}
      <header className="va-header">
        <div className="va-header-content">
          <div className="va-title-section">
            <h1 className="va-title">
              <span className="va-title-icon">📊</span>
              Attendance History
            </h1>
            <p className="va-subtitle">
              View and manage all attendance sessions
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="va-quick-stats">
            <div className="va-stat-pill">
              <span className="va-stat-value">{summaryStats.totalSessions}</span>
              <span className="va-stat-label">Sessions</span>
            </div>
            <div className="va-stat-pill success">
              <span className="va-stat-value">{summaryStats.avgAttendance}%</span>
              <span className="va-stat-label">Avg Rate</span>
            </div>
          </div>
        </div>
        
        {/* Mobile Filter Toggle */}
        <button 
          className="va-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="filter-icon">⚙️</span>
          <span>Filters</span>
          {hasActiveFilters && <span className="filter-badge">{Object.values(filters).filter(Boolean).length - 2}</span>}
        </button>
      </header>

      {/* Filters Panel */}
      <FiltersPanel
        classes={classes}
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hasActiveFilters={hasActiveFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Main Content */}
      <main className="va-main">
        {loading ? (
          <div className="va-loading">
            <div className="va-loading-spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        ) : processedSessions.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            totalSessions={sessions.length}
          />
        ) : (
          <>
            {/* Results Header */}
            <div className="va-results-header">
              <div className="va-results-info">
                <span className="va-results-count">
                  Showing <strong>{processedSessions.length}</strong> of <strong>{sessions.length}</strong> sessions
                </span>
              </div>
              
              {/* View Mode Toggle */}
              <div className="va-view-toggle">
                <button 
                  className={`va-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button 
                  className={`va-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Sessions Grid/List */}
            <div className={`va-sessions va-sessions--${viewMode}`}>
              {processedSessions.map(session => (
                <SessionCardNew
                  key={session.id}
                  session={session}
                  viewMode={viewMode}
                  onSelect={handleSelectSession}
                  formatDate={formatDate}
                  calculateRate={calculateAttendanceRate}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Session Details Modal */}
      {showDetailsModal && selectedSessionData && (
        <SessionDetailsModal
          session={selectedSessionData}
          records={sessionRecords}
          onClose={handleCloseModal}
          formatDate={formatDate}
          calculateRate={calculateAttendanceRate}
        />
      )}
    </div>
  );
}
