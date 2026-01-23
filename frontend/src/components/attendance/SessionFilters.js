import React from 'react';

/**
 * SessionFilters - Filter controls for attendance sessions
 * Provides class filter, search, date filter, sort options, and view mode toggle
 */
export default function SessionFilters({
  classes,
  selectedClass,
  setSelectedClass,
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode
}) {
  return (
    <div className="filters-section">
      <div className="filters-container">
        {/* First Row - Main Filters */}
        <div className="filters-row">
          <div className="filter-group">
            <label>
              <span className="filter-icon">🏫</span>
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="filter-select"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - Section {cls.section}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <span className="filter-icon">🔍</span>
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>
              <span className="filter-icon">📅</span>
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        {/* Second Row - Sort & View Controls */}
        <div className="filters-row">
          <div className="filter-group">
            <label>
              <span className="filter-icon">📊</span>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date">Date</option>
              <option value="name">Session Name</option>
              <option value="attendance">Attendance Rate</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <span className="filter-icon">🔄</span>
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <span className="filter-icon">👁️</span>
              View Mode
            </label>
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
