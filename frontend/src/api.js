// API base URL configuration for deployment
// In development: Uses localhost
// In production: Uses the environment variable REACT_APP_API_BASE
// Example for AWS EC2: REACT_APP_API_BASE=http://<AWS-EC2-PUBLIC-IP>:8000
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// Photo base URL for displaying images
// For S3 storage: REACT_APP_PHOTO_BASE=https://bucket-name.s3.region.amazonaws.com
// For local storage: REACT_APP_PHOTO_BASE=http://localhost:8000 (or your backend URL)
const PHOTO_BASE = process.env.REACT_APP_PHOTO_BASE || API_BASE;

async function apiRequest(url, options = {}) {
  try {
    const token = localStorage.getItem('auth_token');
    const mergedHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers: mergedHeaders });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'An unknown error occurred' }));
      throw new Error(errorData.detail);
    }
    return res.json();
  } catch (error) {
    console.error(`API Request failed for ${url}:`, error);
    throw error;
  }
}

// Helper function to get the full photo URL
export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  
  // If it's already a full URL (S3), return as is
  if (photoPath.startsWith('http')) {
    return photoPath;
  }
  
  // For local storage, construct the full URL
  if (photoPath.startsWith('/static/')) {
    return `${PHOTO_BASE}${photoPath}`;
  }
  
  // Handle relative paths
  return `${PHOTO_BASE}/static/${photoPath}`;
};

export const fetchStudents = () => apiRequest('/student/');

export const fetchAttendanceData = async () => {
  const [sessions, stats] = await Promise.all([
    apiRequest('/attendance/sessions'),
    apiRequest('/attendance/stats'),
  ]);
  return { sessions, stats };
};

export const fetchSessionRecords = (sessionId) =>
  apiRequest(`/attendance/records?session_id=${encodeURIComponent(sessionId)}`);

// New helpers for exports UI
export const fetchExportClasses = () => apiRequest('/attendance/classes/available');
export const fetchStudentsFiltered = (classId, division, page = 1, pageSize = 100) => {
  const params = new URLSearchParams();
  if (classId) params.set('class_id', classId);
  if (division) params.set('division', division);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return apiRequest(`/student/filter?${params.toString()}`);
};
export const downloadStudentCsv = async (studentId, dateFrom, dateTo) => {
  const params = new URLSearchParams();
  params.set('student_id', studentId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  params.set('format', 'csv');
  const url = `${API_BASE}/attendance/export/student?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `student_${studentId}_attendance.csv`;
  a.click();
};

export const downloadStudentPdf = async (studentId, dateFrom, dateTo) => {
  const params = new URLSearchParams();
  params.set('student_id', studentId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  params.set('format', 'pdf');
  const url = `${API_BASE}/attendance/export/student?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
  if (!res.ok) throw new Error('Failed to download PDF');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `student_${studentId}_attendance.pdf`;
  a.click();
};
export const downloadClassCsv = async (classId, division, dateFrom, dateTo) => {
  const params = new URLSearchParams();
  params.set('class_id', classId);
  if (division) params.set('division', division);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const url = `${API_BASE}/attendance/export/class-csv?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `class_${classId}_attendance.csv`;
  a.click();
};
