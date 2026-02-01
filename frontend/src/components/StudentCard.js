import React, { useState } from 'react';
import PropTypes from 'prop-types';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

const buildPhotoUrl = (student) => {
  if (!student?.photo_url) return undefined;
  
  // Ensure the URL is properly formed
  let photoUrl = student.photo_url;
  if (!photoUrl.startsWith('http') && !photoUrl.startsWith('/')) {
    photoUrl = `/${photoUrl}`;
  }
  
  // Add cache busting parameter
  const ver = student.updated_at || student.created_at || student.id || Date.now();
  const sep = photoUrl.includes('?') ? '&' : '?';
  return `${API_BASE}${photoUrl}${sep}v=${encodeURIComponent(ver)}`;
};

const StudentCard = ({ student, onEdit, onDelete, onToggle, onViewDetails, onUpgradeEmbeddings, userRole }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canDelete = userRole === 'superadmin'; // Only superadmin can delete students
  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjhGOUZBIi8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDUiIHI9IjE4IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yNSA5NUMzMCA4MCA0NCA3MCA2MCA3MEM3NiA3MCA5MCA4MCA5NSA5NUwyNSA5NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHN2Zz4K';

  const handleImageError = (e) => {
    e.target.src = DEFAULT_AVATAR;
  };

  const photoSrc = buildPhotoUrl(student) || DEFAULT_AVATAR;

  // Medical/Dental themed icons for different info types
  const getInfoIcon = (type) => {
    const icons = {
      rollNo: '📋',
      prn: '🆔', 
      seatNo: '💺',
      class: '🏫',
      email: '📧',
      phone: '📱',
      age: '🎂'
    };
    return icons[type] || '📄';
  };

  const handleCardClick = (e) => {
    // Don't toggle if clicking on buttons
    if (e.target.closest('.card-actions') || e.target.closest('button')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`student-card ${isExpanded ? 'expanded' : 'collapsed'}`} onClick={handleCardClick}>
      {/* Expand/Collapse indicator */}
      <div className="expand-indicator">
        <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
      </div>
      
      {/* Medical Card Header Badge - only shown when expanded */}
      {isExpanded && (
        <div className="card-badge">
          <span className="badge-icon">🦷</span>
          <span className="badge-text">Student ID: {student.id}</span>
        </div>
      )}
      
      <div className="student-avatar">
        <div className="photo-container">
          <img
            className="student-photo"
            src={photoSrc}
            alt={student.name}
            onError={handleImageError}
          />
          <div className={`status-ring ${student.is_active ? 'active' : 'inactive'}`}>
            <span className="status-dot"></span>
          </div>
        </div>
      </div>
      
      <div className="student-info">
        <h3 className="student-name">
          <span className="name-icon">👤</span>
          {student.name}
        </h3>
        
        {/* Class/Department - Always visible in collapsed view */}
        {student.class_name && (
          <div className="collapsed-info">
            <div className="info-item class-info">
              <span className="info-icon">{getInfoIcon('class')}</span>
              <div className="info-content">
                <span className="info-label">Class</span>
                <span className="info-value">{student.class_name} - Section {student.class_section}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Expanded details - Only shown when expanded */}
        {isExpanded && (
          <>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-icon">{getInfoIcon('rollNo')}</span>
                <div className="info-content">
                  <span className="info-label">Roll No</span>
                  <span className="info-value">{student.roll_no}</span>
                </div>
              </div>
              
              <div className="info-item">
                <span className="info-icon">{getInfoIcon('prn')}</span>
                <div className="info-content">
                  <span className="info-label">PRN</span>
                  <span className="info-value">{student.prn || 'N/A'}</span>
                </div>
              </div>
              
              <div className="info-item">
                <span className="info-icon">{getInfoIcon('seatNo')}</span>
                <div className="info-content">
                  <span className="info-label">Seat No</span>
                  <span className="info-value">{student.seat_no || 'N/A'}</span>
                </div>
              </div>
              
              {student.age && (
                <div className="info-item">
                  <span className="info-icon">{getInfoIcon('age')}</span>
                  <div className="info-content">
                    <span className="info-label">Age</span>
                    <span className="info-value">{student.age}</span>
                  </div>
                </div>
              )}
          
              {student.email && (
                <div className="info-item contact-info">
                  <span className="info-icon">{getInfoIcon('email')}</span>
                  <div className="info-content">
                    <span className="info-label">Email</span>
                    <span className="info-value">{student.email}</span>
                  </div>
                </div>
              )}
              
              {student.phone && (
                <div className="info-item contact-info">
                  <span className="info-icon">{getInfoIcon('phone')}</span>
                  <div className="info-content">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{student.phone}</span>
                  </div>
                </div>
              )}
            </div>
        
            <div className="status-badge">
              <span className={`status ${student.is_active ? 'active' : 'inactive'}`}>
                <span className="status-icon">{student.is_active ? '✅' : '⏸️'}</span>
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
        
            {/* Enhanced Embedding Information */}
            {student.has_enhanced_embeddings && (
              <div className="enhanced-badge">
                <span className="enhanced-icon">🚀</span>
                <span className="enhanced-text">Enhanced AI</span>
                {student.embedding_confidence && (
                  <span className="confidence-score">
                    {(student.embedding_confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Card Actions - Only shown when expanded */}
      {isExpanded && (
        <div className="card-actions">
          <button className="modern-btn primary" onClick={() => onViewDetails(student.id)}>
            <span className="btn-icon">👁️</span>
            View Details
          </button>
          <button className="modern-btn secondary" onClick={() => onEdit(student)}>
            <span className="btn-icon">✏️</span>
            Edit
          </button>
          {/* Delete button - Only visible for superadmin */}
          {canDelete && (
            <button className="modern-btn danger" onClick={() => onDelete(student.id, student.name)}>
              <span className="btn-icon">🗑️</span>
              Delete
            </button>
          )}
          
          {/* Upgrade/Re-upgrade AI Embeddings Button - Always show */}
          {onUpgradeEmbeddings && (
            <button 
              className={`modern-btn ${student.has_enhanced_embeddings ? 'refresh' : 'upgrade'}`}
              onClick={() => onUpgradeEmbeddings(student.id)}
              title={student.has_enhanced_embeddings ? "Re-generate AI embeddings with new photo" : "Upgrade to Enhanced AI Recognition"}
            >
              <span className="btn-icon">{student.has_enhanced_embeddings ? '🔄' : '🚀'}</span>
              {student.has_enhanced_embeddings ? 'Update AI' : 'Upgrade AI'}
            </button>
          )}
          <button className="modern-btn" onClick={() => onToggle(student.id, student.is_active)}>
            <span className="btn-icon">{student.is_active ? '⏸️' : '▶️'}</span>
            {student.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )}
    </div>
  );
};

StudentCard.propTypes = {
  student: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  userRole: PropTypes.string,
};

export default StudentCard;
