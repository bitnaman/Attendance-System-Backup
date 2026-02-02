import React from 'react';

/**
 * ModeToggle Component
 * Allows switching between Single Photo and Batch Photo modes
 */
export default function ModeToggle({ showBatch, onModeChange }) {
  return (
    <div className="ma-mode-section">
      <div className="ma-mode-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
        <span>Attendance Mode</span>
      </div>
      
      <div className="ma-mode-grid">
        {/* Single Photo Mode */}
        <button 
          type="button"
          className={`ma-mode-card ${!showBatch ? 'active' : ''}`}
          onClick={() => onModeChange(false)}
        >
          <div className="ma-mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill={!showBatch ? 'white' : 'currentColor'}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="ma-mode-info">
            <h4>Single Photo</h4>
            <p>Best for classes up to 60 students</p>
          </div>
        </button>

        {/* Batch Photo Mode */}
        <button 
          type="button"
          className={`ma-mode-card batch ${showBatch ? 'active' : ''}`}
          onClick={() => onModeChange(true)}
        >
          <span className="ma-mode-badge">Pro</span>
          <div className="ma-mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill={showBatch ? 'white' : 'currentColor'}>
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1zm-4-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0h-3V8h3v2zm0-4h-3V4h3v2z"/>
            </svg>
          </div>
          <div className="ma-mode-info">
            <h4>Batch Photos</h4>
            <p>Upload 3-5 photos for large classes (100+)</p>
          </div>
        </button>
      </div>
    </div>
  );
}
