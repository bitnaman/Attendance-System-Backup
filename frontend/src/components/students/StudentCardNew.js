import React from 'react';

/**
 * StudentCardNew - Modern student card with glassmorphism design
 * Supports both grid and list view modes
 */
const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

const buildPhotoUrl = (student) => {
  if (!student?.photo_url) return undefined;
  
  let photoUrl = student.photo_url;
  if (!photoUrl.startsWith('http') && !photoUrl.startsWith('/')) {
    photoUrl = `/${photoUrl}`;
  }
  
  const ver = student.updated_at || student.created_at || student.id || Date.now();
  const sep = photoUrl.includes('?') ? '&' : '?';
  return `${API_BASE}${photoUrl}${sep}v=${encodeURIComponent(ver)}`;
};

export default function StudentCardNew({
  student,
  viewMode,
  onEdit,
  onDelete,
  onToggle,
  onViewDetails,
  onUpgradeEmbeddings,
  userRole
}) {
  const canDelete = userRole === 'superadmin';
  const photoSrc = buildPhotoUrl(student);
  const initials = student.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleCardClick = () => {
    onViewDetails(student.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails(student.id);
    }
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  // List View
  if (viewMode === 'list') {
    return (
      <div 
        className="ms-card ms-card--list"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`View ${student.name} details`}
      >
        <div className="ms-card-list-avatar">
          {photoSrc ? (
            <img 
              src={photoSrc} 
              alt={student.name}
              onError={(e) => {
                if (e.target) {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className="ms-card-list-avatar-placeholder"
            style={{ display: photoSrc ? 'none' : 'flex' }}
          >
            {initials}
          </div>
          <div className={`ms-status-indicator ms-status-indicator--${student.is_active ? 'active' : 'inactive'}`} />
        </div>
        
        <div className="ms-card-list-info">
          <h3 className="ms-card-list-name">{student.name}</h3>
          <div className="ms-card-list-meta">
            <span className="ms-card-list-meta-item">
              📋 Roll: {student.roll_no}
            </span>
            <span className="ms-card-list-meta-divider">•</span>
            <span className="ms-card-list-meta-item">
              🏫 {student.class_name || 'No Class'} {student.class_section && `- ${student.class_section}`}
            </span>
            {student.prn && (
              <>
                <span className="ms-card-list-meta-divider">•</span>
                <span className="ms-card-list-meta-item">
                  🆔 {student.prn}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="ms-card-list-stats">
          <div className="ms-card-list-stat">
            <span className="ms-card-list-stat-value">{student.seat_no || 'N/A'}</span>
            <span className="ms-card-list-stat-label">Seat</span>
          </div>
          <div className="ms-card-list-stat">
            <span className="ms-card-list-stat-value">{student.age || 'N/A'}</span>
            <span className="ms-card-list-stat-label">Age</span>
          </div>
        </div>
        
        <div className="ms-card-list-actions">
          <button 
            className="ms-btn ms-btn--primary ms-btn--icon-only"
            onClick={(e) => handleActionClick(e, () => onViewDetails(student.id))}
            title="View Details"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button 
            className="ms-btn ms-btn--secondary ms-btn--icon-only"
            onClick={(e) => handleActionClick(e, () => onEdit(student))}
            title="Edit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button 
            className={`ms-btn ms-btn--${student.is_active ? 'warning' : 'success'} ms-btn--icon-only`}
            onClick={(e) => handleActionClick(e, () => onToggle(student.id, student.is_active))}
            title={student.is_active ? 'Deactivate' : 'Activate'}
          >
            {student.is_active ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Grid View (default)
  return (
    <div 
      className="ms-card ms-card--grid"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View ${student.name} details`}
    >
      {/* Card Header with Gradient */}
      <div className={`ms-card-header ms-card-header--${student.is_active ? 'active' : 'inactive'}`}>
        <div className="ms-card-header-content">
          <span className="ms-card-id-badge">
            🎓 ID: {student.id}
          </span>
          <h3 className="ms-card-name">
            {student.name}
          </h3>
          <span className="ms-card-class">
            🏫 {student.class_name || 'No Class'} {student.class_section && `- ${student.class_section}`}
          </span>
        </div>
        
        {/* Avatar positioned at bottom of header */}
        <div className="ms-card-avatar">
          <div className="ms-card-avatar-inner">
            {photoSrc ? (
              <img 
                className="ms-card-avatar-img"
                src={photoSrc} 
                alt={student.name}
                onError={(e) => {
                  if (e.target) {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="ms-card-avatar-placeholder"
              style={{ display: photoSrc ? 'none' : 'flex' }}
            >
              {initials}
            </div>
          </div>
          <div className={`ms-status-ring ms-status-ring--${student.is_active ? 'active' : 'inactive'}`}>
            {student.is_active ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="ms-card-body">
        {/* Info Grid */}
        <div className="ms-card-info-grid">
          <div className="ms-card-info-item">
            <span className="ms-card-info-icon">📋</span>
            <div className="ms-card-info-content">
              <span className="ms-card-info-label">Roll No</span>
              <span className="ms-card-info-value">{student.roll_no || 'N/A'}</span>
            </div>
          </div>
          
          <div className="ms-card-info-item">
            <span className="ms-card-info-icon">🆔</span>
            <div className="ms-card-info-content">
              <span className="ms-card-info-label">PRN</span>
              <span className="ms-card-info-value">{student.prn || 'N/A'}</span>
            </div>
          </div>
          
          <div className="ms-card-info-item">
            <span className="ms-card-info-icon">💺</span>
            <div className="ms-card-info-content">
              <span className="ms-card-info-label">Seat No</span>
              <span className="ms-card-info-value">{student.seat_no || 'N/A'}</span>
            </div>
          </div>
          
          <div className="ms-card-info-item">
            <span className="ms-card-info-icon">🎂</span>
            <div className="ms-card-info-content">
              <span className="ms-card-info-label">Age</span>
              <span className="ms-card-info-value">{student.age || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {(student.email || student.phone) && (
          <div className="ms-card-contact">
            {student.email && (
              <div className="ms-card-contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>{student.email}</span>
              </div>
            )}
            {student.phone && (
              <div className="ms-card-contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{student.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* AI Badge */}
        {student.has_enhanced_embeddings && (
          <div className="ms-ai-badge">
            <span className="ms-ai-badge-icon">🚀</span>
            <span className="ms-ai-badge-text">Enhanced AI</span>
            {student.embedding_confidence && (
              <span className="ms-ai-badge-confidence">
                {(student.embedding_confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="ms-card-actions">
          <button 
            className="ms-btn ms-btn--primary"
            onClick={(e) => handleActionClick(e, () => onViewDetails(student.id))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View
          </button>
          
          <button 
            className="ms-btn ms-btn--secondary"
            onClick={(e) => handleActionClick(e, () => onEdit(student))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          
          {canDelete && (
            <button 
              className="ms-btn ms-btn--danger"
              onClick={(e) => handleActionClick(e, () => onDelete(student.id, student.name))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          )}
          
          {onUpgradeEmbeddings && (
            <button 
              className={`ms-btn ${student.has_enhanced_embeddings ? 'ms-btn--ghost' : 'ms-btn--success'}`}
              onClick={(e) => handleActionClick(e, () => onUpgradeEmbeddings(student.id))}
              title={student.has_enhanced_embeddings ? "Re-generate AI embeddings" : "Upgrade to Enhanced AI"}
            >
              {student.has_enhanced_embeddings ? '🔄' : '🚀'}
              {student.has_enhanced_embeddings ? 'Update AI' : 'Upgrade AI'}
            </button>
          )}
          
          <button 
            className={`ms-btn ${student.is_active ? 'ms-btn--warning' : 'ms-btn--success'}`}
            onClick={(e) => handleActionClick(e, () => onToggle(student.id, student.is_active))}
          >
            {student.is_active ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {student.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
