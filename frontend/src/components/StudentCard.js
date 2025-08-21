import React from 'react';
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

const StudentCard = ({ student, onEdit, onDelete, onToggle }) => {
  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjhGOUZBIi8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDUiIHI9IjE4IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yNSA5NUMzMCA4MCA0NCA3MCA2MCA3MEM3NiA3MCA5MCA4MCA5NSA5NUwyNSA5NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHN2Zz4K';

  const handleImageError = (e) => {
    e.target.src = DEFAULT_AVATAR;
  };

  const photoSrc = buildPhotoUrl(student) || DEFAULT_AVATAR;

  return (
    <div className="student-card">
      <div className="student-avatar">
        <img
          className="student-photo"
          src={photoSrc}
          alt={student.name}
          onError={handleImageError}
        />
      </div>
      <div className="student-info">
        <h3>{student.name}</h3>
        <p><strong>Roll No:</strong> {student.roll_no}</p>
        <p><strong>PRN:</strong> {student.prn}</p>
        <p><strong>Seat No:</strong> {student.seat_no}</p>
        {student.class_name && (
          <p><strong>Class:</strong> {student.class_name} - Section {student.class_section}</p>
        )}
        <p><strong>Email:</strong> {student.email}</p>
        <p><strong>Phone:</strong> {student.phone}</p>
        <span className={`status ${student.is_active ? 'active' : 'inactive'}`}>
          {student.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="card-actions">
        <button className="modern-btn secondary" onClick={() => onEdit(student)}>Edit</button>
        <button className="modern-btn danger" onClick={() => onDelete(student.id, student.name)}>Delete</button>
        <button className="modern-btn" onClick={() => onToggle(student.id, student.is_active)}>
          {student.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

StudentCard.propTypes = {
  student: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default StudentCard;
