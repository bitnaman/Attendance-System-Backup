import React, { useRef, useEffect } from 'react';

/**
 * StudentFilters - Collapsible filters panel for mobile and desktop
 * Modern design with smooth animations
 */
export default function StudentFilters({
  classes,
  filters,
  updateFilter,
  clearFilters,
  hasActiveFilters,
  isOpen,
  onClose,
  availableDivisions = []
}) {
  const panelRef = useRef(null);

  // Close panel when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        if (!e.target.closest('.ms-filter-toggle')) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="ms-filters-backdrop" onClick={onClose} />}
      
      <div 
        ref={panelRef}
        className={`ms-filters ${isOpen ? 'ms-filters--open' : ''}`}
      >
        {/* Mobile header */}
        <div className="ms-filters-header-mobile">
          <h3>🔍 Filters</h3>
          <button className="ms-filters-close" onClick={onClose} aria-label="Close filters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ms-filters-content">
          {/* Search */}
          <div className="ms-filter-group ms-filter-group--search">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              Search
            </label>
            <div className="ms-search-input-wrapper">
              <input
                type="text"
                placeholder="Search by name, roll no, PRN..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="ms-filter-input"
              />
              {filters.searchTerm && (
                <button 
                  className="ms-input-clear"
                  onClick={() => updateFilter('searchTerm', '')}
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Class Filter */}
          <div className="ms-filter-group">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 12.18L3.58 10 12 4.72 20.42 10 12 15.18z"/>
                <path d="M12 16l-7-4v4.18c0 .45.12.89.36 1.29C6.06 18.72 8.54 20 12 20s5.94-1.28 6.64-2.53c.24-.4.36-.84.36-1.29V12l-7 4z"/>
              </svg>
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) => {
                updateFilter('classId', e.target.value);
                updateFilter('division', ''); // Reset division when class changes
              }}
              className="ms-filter-select"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section && `- ${cls.section}`}
                </option>
              ))}
            </select>
          </div>

          {/* Division Filter */}
          <div className="ms-filter-group">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
              </svg>
              Division
            </label>
            <select
              value={filters.division}
              onChange={(e) => updateFilter('division', e.target.value)}
              disabled={!filters.classId || availableDivisions.length === 0}
              className="ms-filter-select"
            >
              <option value="">All Divisions</option>
              {availableDivisions.map(division => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="ms-filter-group">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="ms-filter-select"
            >
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="ms-filter-group">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
              </svg>
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="ms-filter-select"
            >
              <option value="name">Name</option>
              <option value="roll_no">Roll Number</option>
              <option value="created_at">Recently Added</option>
              <option value="class">Class</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="ms-filter-group">
            <label className="ms-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => updateFilter('sortOrder', e.target.value)}
              className="ms-filter-select"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="ms-filter-actions">
              <button 
                className="ms-btn-clear"
                onClick={clearFilters}
              >
                ✕ Clear All
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
