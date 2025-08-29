// API base URL configuration for deployment
// In development: Uses localhost
// In production: Uses the environment variable REACT_APP_API_BASE
// Example for AWS EC2: REACT_APP_API_BASE=http://<AWS-EC2-PUBLIC-IP>:8000
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, options);
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
