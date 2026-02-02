import React, { useRef, useEffect } from 'react';

/**
 * FiltersPanel - Collapsible filters panel for mobile and desktop
 * Modern design with smooth animations
 */
export default function FiltersPanel({
  classes,
  filters,
  updateFilter,
  clearFilters,
  viewMode,
  setViewMode,
  hasActiveFilters,
  isOpen,
  onClose
}) {
  const panelRef = useRef(null);

  // Close panel when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if click target is the toggle button
        if (!e.target.closest('.va-filter-toggle')) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="va-filters-backdrop" onClick={onClose} />}
      
      <div 
        ref={panelRef}
        className={`va-filters ${isOpen ? 'va-filters--open' : ''}`}
      >
        {/* Mobile header */}
        <div className="va-filters-header-mobile">
          <h3>Filters</h3>
          <button className="va-filters-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="va-filters-content">
          {/* Search */}
          <div className="va-filter-group va-filter-group--search">
            <label className="va-filter-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              Search
            </label>
            <div className="va-search-input-wrapper">
              <input
                type="text"
                placeholder="Search sessions..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="va-filter-input"
              />
              {filters.searchTerm && (
                <button 
                  className="va-input-clear"
                  onClick={() => updateFilter('searchTerm', '')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Class Filter */}
          <div className="va-filter-group">
            <label className="va-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 12.18L3.58 10 12 4.72 20.42 10 12 15.18z"/>
                <path d="M12 16l-7-4v4.18c0 .45.12.89.36 1.29C6.06 18.72 8.54 20 12 20s5.94-1.28 6.64-2.53c.24-.4.36-.84.36-1.29V12l-7 4z"/>
              </svg>
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) => updateFilter('classId', e.target.value)}
              className="va-filter-select"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section && `- ${cls.section}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="va-filter-group">
            <label className="va-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
              </svg>
              Date
            </label>
            <input
              type="date"
              value={filters.dateFilter}
              onChange={(e) => updateFilter('dateFilter', e.target.value)}
              className="va-filter-input"
            />
          </div>

          {/* Sort By */}
          <div className="va-filter-group">
            <label className="va-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
              </svg>
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="va-filter-select"
            >
              <option value="date">Date</option>
              <option value="name">Session Name</option>
              <option value="attendance">Attendance Rate</option>
              <option value="class">Class Name</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="va-filter-group">
            <label className="va-filter-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
              Order
            </label>
            <div className="va-toggle-buttons">
              <button
                className={`va-toggle-btn ${filters.sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => updateFilter('sortOrder', 'desc')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14l5 5 5-5z"/>
                </svg>
                Newest
              </button>
              <button
                className={`va-toggle-btn ${filters.sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => updateFilter('sortOrder', 'asc')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5-5 5 5z"/>
                </svg>
                Oldest
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button 
              className="va-clear-filters-btn"
              onClick={clearFilters}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Clear All Filters
            </button>
          )}
        </div>

        {/* Mobile Apply Button */}
        <div className="va-filters-footer-mobile">
          <button className="va-btn va-btn--primary" onClick={onClose}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
