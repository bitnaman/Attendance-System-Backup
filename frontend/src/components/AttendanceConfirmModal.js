import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../styles/attendance-confirm-modal.css';

export default function AttendanceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  processing
}) {
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'detected', 'missed'
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize selected students from preview data (auto-detected students)
  useEffect(() => {
    if (previewData?.all_students && !isInitialized) {
      const detectedIds = new Set(
        previewData.all_students
          .filter(s => s.is_detected)
          .map(s => s.id)
      );
      setSelectedStudents(detectedIds);
      setIsInitialized(true);
    }
  }, [previewData, isInitialized]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      setSearchTerm('');
      setFilterMode('all');
      setSelectedStudents(new Set()); // Clear selected students when modal closes
    }
  }, [isOpen]);

  // Memoize all students array
  const allStudents = useMemo(() => {
    return previewData?.all_students || [];
  }, [previewData?.all_students]);

  // Filter students based on search and filter mode
  const filteredStudents = useMemo(() => {
    let students = [...allStudents];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      students = students.filter(s => 
        s.name.toLowerCase().includes(term) ||
        String(s.roll_no).toLowerCase().includes(term) ||
        (s.prn && s.prn.toLowerCase().includes(term))
      );
    }
    
    // Apply detection filter
    if (filterMode === 'detected') {
      students = students.filter(s => s.is_detected);
    } else if (filterMode === 'missed') {
      students = students.filter(s => !s.is_detected);
    }
    
    return students;
  }, [allStudents, searchTerm, filterMode]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allStudents.length;
    const detected = allStudents.filter(s => s.is_detected).length;
    const missed = total - detected;
    
    // Only count selected students that exist in current allStudents
    const validStudentIds = new Set(allStudents.map(s => s.id));
    const validSelectedCount = Array.from(selectedStudents).filter(id => validStudentIds.has(id)).length;
    
    // Calculate manual adjustments (only for valid students)
    const manuallyAdded = Array.from(selectedStudents).filter(
      id => validStudentIds.has(id) && !allStudents.find(s => s.id === id && s.is_detected)
    ).length;
    
    const manuallyRemoved = allStudents.filter(
      s => s.is_detected && !selectedStudents.has(s.id)
    ).length;

    return { total, detected, selected: validSelectedCount, missed, manuallyAdded, manuallyRemoved };
  }, [allStudents, selectedStudents]);

  const handleToggleStudent = useCallback((studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedStudents(new Set(allStudents.map(s => s.id)));
  }, [allStudents]);

  const handleDeselectAll = useCallback(() => {
    setSelectedStudents(new Set());
  }, []);

  const handleResetToDetected = useCallback(() => {
    const detectedIds = new Set(
      allStudents.filter(s => s.is_detected).map(s => s.id)
    );
    setSelectedStudents(detectedIds);
  }, [allStudents]);

  const handleConfirm = useCallback(() => {
    // Only send IDs that are valid (exist in current allStudents)
    const validStudentIds = new Set(allStudents.map(s => s.id));
    const validSelectedIds = Array.from(selectedStudents).filter(id => validStudentIds.has(id));
    onConfirm(validSelectedIds);
  }, [onConfirm, selectedStudents, allStudents]);

  const handleClose = useCallback(() => {
    if (!processing) {
      onClose();
    }
  }, [onClose, processing]);

  if (!isOpen || !previewData) return null;

  return (
    <div className="acm-overlay" onClick={handleClose}>
      <div className="acm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="acm-header">
          <div className="acm-header-content">
            <div className="acm-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <div className="acm-header-text">
              <h2>Review & Confirm Attendance</h2>
              <p>{previewData.session_name} • {previewData.class_name}</p>
            </div>
          </div>
          <button className="acm-close-btn" onClick={handleClose} disabled={processing} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>

        {/* Stats Row */}
        <div className="acm-stats">
          <div className="acm-stat-card">
            <div className="acm-stat-icon total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="acm-stat-info">
              <span className="acm-stat-value">{stats.total}</span>
              <span className="acm-stat-label">Total</span>
            </div>
          </div>
          
          <div className="acm-stat-card detected">
            <div className="acm-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="acm-stat-info">
              <span className="acm-stat-value">{stats.detected}</span>
              <span className="acm-stat-label">Detected</span>
            </div>
          </div>

          <div className="acm-stat-card selected">
            <div className="acm-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="acm-stat-info">
              <span className="acm-stat-value">{stats.selected}</span>
              <span className="acm-stat-label">Present</span>
            </div>
          </div>

          <div className="acm-stat-card faces">
            <div className="acm-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
              </svg>
            </div>
            <div className="acm-stat-info">
              <span className="acm-stat-value">{previewData.total_faces_detected || 0}</span>
              <span className="acm-stat-label">Faces</span>
            </div>
          </div>
        </div>

        {/* Manual Adjustments Indicator */}
        {(stats.manuallyAdded > 0 || stats.manuallyRemoved > 0) && (
          <div className="acm-adjustments">
            {stats.manuallyAdded > 0 && (
              <span className="acm-adjustment added">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {stats.manuallyAdded} added manually
              </span>
            )}
            {stats.manuallyRemoved > 0 && (
              <span className="acm-adjustment removed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H5v-2h14v2z"/>
                </svg>
                {stats.manuallyRemoved} removed
              </span>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="acm-controls">
          <div className="acm-search">
            <svg className="acm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="acm-search-input"
            />
            {searchTerm && (
              <button className="acm-search-clear" onClick={() => setSearchTerm('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
          
          <div className="acm-filters">
            <button 
              className={`acm-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All <span className="acm-filter-count">{stats.total}</span>
            </button>
            <button 
              className={`acm-filter-btn ${filterMode === 'detected' ? 'active' : ''}`}
              onClick={() => setFilterMode('detected')}
            >
              Detected <span className="acm-filter-count">{stats.detected}</span>
            </button>
            <button 
              className={`acm-filter-btn ${filterMode === 'missed' ? 'active' : ''}`}
              onClick={() => setFilterMode('missed')}
            >
              Missed <span className="acm-filter-count">{stats.missed}</span>
            </button>
          </div>

          <div className="acm-bulk-actions">
            <button className="acm-bulk-btn" onClick={handleSelectAll}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
              </svg>
              All
            </button>
            <button className="acm-bulk-btn" onClick={handleDeselectAll}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              None
            </button>
            <button className="acm-bulk-btn reset" onClick={handleResetToDetected}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
              </svg>
              Reset
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="acm-student-list">
          {filteredStudents.length === 0 ? (
            <div className="acm-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <p>No students found</p>
              <span>Try adjusting your search or filter</span>
            </div>
          ) : (
            <div className="acm-student-grid">
              {filteredStudents.map(student => {
                const isSelected = selectedStudents.has(student.id);
                const isDetected = student.is_detected;
                
                return (
                  <div 
                    key={student.id}
                    className={`acm-student-card ${isSelected ? 'selected' : ''} ${isDetected ? 'detected' : ''}`}
                    onClick={() => handleToggleStudent(student.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleToggleStudent(student.id)}
                  >
                    <div className="acm-student-check">
                      <div className={`acm-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="acm-student-info">
                      <div className="acm-student-name">{student.name}</div>
                      <div className="acm-student-meta">
                        <span className="acm-roll">Roll #{student.roll_no}</span>
                        {student.prn && <span className="acm-prn">{student.prn}</span>}
                      </div>
                    </div>
                    
                    <div className="acm-student-badge">
                      {isDetected ? (
                        <span className="acm-badge detected" title={`Confidence: ${(student.confidence * 100).toFixed(1)}%`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {(student.confidence * 100).toFixed(0)}%
                        </span>
                      ) : isSelected ? (
                        <span className="acm-badge manual">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.21 0-.59-.34-1.15-.91-1.41z"/>
                          </svg>
                          Manual
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="acm-footer">
          <div className="acm-summary">
            <div className="acm-summary-item present">
              <span className="acm-summary-count">{stats.selected}</span>
              <span className="acm-summary-label">will be marked Present</span>
            </div>
            <div className="acm-summary-divider">•</div>
            <div className="acm-summary-item absent">
              <span className="acm-summary-count">{stats.total - stats.selected}</span>
              <span className="acm-summary-label">will be marked Absent</span>
            </div>
          </div>
          
          <div className="acm-actions">
            <button 
              className="acm-btn secondary" 
              onClick={handleClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button 
              className="acm-btn primary" 
              onClick={handleConfirm}
              disabled={processing || stats.selected === 0}
            >
              {processing ? (
                <>
                  <span className="acm-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Confirm Attendance
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

