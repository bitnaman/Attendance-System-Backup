import React, { useState } from "react";

// A lightweight, standalone uploader for quick attendance marking.
// Useful for demos or debugging without the full MarkAttendance form.
// Not wired by default; you can import and use it if needed.

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

function UploadPanel({ onAttendanceUpdate }) {
  const [file, setFile] = useState(null);
  const [sessionName, setSessionName] = useState("Quick Session");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null); // normalized processing result

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a photo first");
      return;
    }
    if (!sessionName.trim()) {
      setMessage("Please provide a session name");
      return;
    }

    setLoading(true);
    setMessage("Processing image and recognizing faces…");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("session_name", sessionName);
      formData.append("photo", file);

      const response = await fetch(`${API_BASE}/attendance/mark`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMsg = data.detail || data.error || "Failed to process image";
        setMessage(`❌ Error: ${errMsg}`);
        return;
      }

      const pr = data.processing_result || {};
      const normalized = {
        identified_students: pr.identified_students || pr.students_identified || [],
        total_faces: pr.total_faces_detected || pr.total_faces || 0,
        identified_count: (pr.identified_students || pr.students_identified || []).length,
      };
      setResult(normalized);

      setMessage(`✅ Attendance marked! Detected ${normalized.total_faces} faces, identified ${normalized.identified_count}.`);

      if (typeof onAttendanceUpdate === "function") {
        onAttendanceUpdate(pr);
      }
    } catch (error) {
      setMessage("❌ Error: Could not connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-panel">
      <div className="file-input-container">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="e.g., BDS-3A Practical 13-Aug"
            disabled={loading}
          />
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setMessage("");
            setResult(null);
          }}
          disabled={loading}
        />
        {file && (
          <div className="file-preview" style={{ marginTop: 8 }}>
            <p>Selected: {file.name}</p>
            <img
              src={URL.createObjectURL(file)}
              alt="Preview"
              style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: 6 }}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !file || !sessionName.trim()}
        className="submit-btn"
        style={{ marginTop: 12 }}
      >
        {loading ? "Processing…" : "📸 Mark Attendance"}
      </button>

      {message && (
        <div className={`modern-message ${message.startsWith("✅") ? "success" : message.startsWith("❌") ? "error" : "info"}`} style={{ marginTop: 12 }}>
          <div className="message-content">
            <span className="message-text">{message}</span>
          </div>
        </div>
      )}

      {result && (
        <div className="attendance-result" style={{ marginTop: 12 }}>
          <h4>Result</h4>
          <div className="result-summary">
            <div className="stat">
              <span className="stat-value">{result.identified_count}</span>
              <span className="stat-label">Identified</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.total_faces}</span>
              <span className="stat-label">Detected</span>
            </div>
          </div>
          {result.identified_students?.length > 0 && (
            <div className="identified-students" style={{ marginTop: 8 }}>
              <h5>Identified Students</h5>
              <ul className="student-list">
                {result.identified_students.map((s, idx) => (
                  <li key={idx} className="student-item">
                    <span className="student-name">{s.name}</span>
                    {typeof s.roll_number !== 'undefined' && (
                      <span className="student-roll"> (Roll: {s.roll_number})</span>
                    )}
                    {typeof s.confidence !== 'undefined' && (
                      <span className="confidence"> {(s.confidence * 100).toFixed(1)}%</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadPanel;
