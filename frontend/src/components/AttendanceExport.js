import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function AttendanceExport({ showMessage }) {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSummary, setExportSummary] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [exportPeriod, setExportPeriod] = useState('monthly');
  const [exportClass, setExportClass] = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Fetch available classes for export
  useEffect(() => {
    const fetchAvailableClasses = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/classes`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableClasses(data);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        showMessage('Failed to load classes for export', 'error');
      }
    };

    fetchAvailableClasses();
  }, [showMessage]);

  // Fetch export summary when filters change
  useEffect(() => {
    const fetchExportSummary = async () => {
      try {
        const params = new URLSearchParams();
        params.append('period', exportPeriod);
        if (exportClass) {
          params.append('class_id', exportClass);
        }
        
        const response = await fetch(`${API_BASE}/attendance/export/summary?${params}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setExportSummary(data.export_summary);
        }
      } catch (error) {
        console.error('Error fetching export summary:', error);
        showMessage('Failed to load export preview', 'error');
      }
    };

    if (showExportPanel) {
      fetchExportSummary();
    }
  }, [exportPeriod, exportClass, showExportPanel, showMessage]);

  // Export attendance data
  const handleExport = async (format) => {
    setExportLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.append('period', exportPeriod);
      if (exportClass) {
        params.append('class_id', exportClass);
      }
      
      let endpoint = '';
      let mediaType = '';
      let fileExtension = '';
      
      switch (format) {
        case 'excel_summary':
          endpoint = 'excel';
          params.append('format_type', 'summary');
          mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = '.xlsx';
          break;
        case 'excel_detailed':
          endpoint = 'excel';
          params.append('format_type', 'detailed');
          mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = '.xlsx';
          break;
        case 'csv':
          endpoint = 'csv';
          mediaType = 'text/csv';
          fileExtension = '.csv';
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      const response = await fetch(`${API_BASE}/attendance/export/${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': mediaType,
        },
      });
      
      if (response.ok) {
        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `attendance_${exportPeriod}_${new Date().toISOString().slice(0, 10)}${fileExtension}`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showMessage(`File downloaded successfully: ${filename}`, 'success');
        setShowExportPanel(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showMessage(`Export failed: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 24px 0', color: '#333' }}>Attendance Data Export</h3>
      
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        border: '1px solid #e9ecef',
        padding: 24
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20 
        }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>📊 Advanced Export Options</h4>
            <p style={{ margin: 0, color: '#6c757d', fontSize: 14 }}>
              Export your attendance data in various formats with smart filtering
            </p>
          </div>
          <button
            onClick={() => setShowExportPanel(!showExportPanel)}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: showExportPanel ? '#dc3545' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            {showExportPanel ? '❌ Close Export' : '📥 Open Export Options'}
          </button>
        </div>

        {/* Export Controls */}
        {showExportPanel && (
          <div style={{ 
            borderTop: '1px solid #e9ecef', 
            paddingTop: 20 
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 20, 
              marginBottom: 24 
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  📅 Time Period
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ced4da', 
                    borderRadius: 6,
                    fontSize: 16
                  }}
                >
                  <option value="weekly">📅 Last 7 Days</option>
                  <option value="monthly">📊 Last 30 Days</option>
                  <option value="quarterly">📈 Last 90 Days</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  🏫 Class Filter
                </label>
                <select
                  value={exportClass}
                  onChange={(e) => setExportClass(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ced4da', 
                    borderRadius: 6,
                    fontSize: 16
                  }}
                >
                  <option value="">🌐 All Classes</option>
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Export Preview */}
            {exportSummary && (
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: 8, 
                padding: 20, 
                marginBottom: 24,
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>📈 Export Preview</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 16 
                }}>
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'white', 
                    borderRadius: 6,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>⏰</span>
                      <strong style={{ color: '#495057' }}>{exportSummary.period_display}</strong>
                    </div>
                    <small style={{ color: '#6c757d' }}>
                      {exportSummary.start_date} to {exportSummary.end_date}
                    </small>
                  </div>
                  
                  {exportSummary.class_info && (
                    <div style={{ 
                      padding: 12, 
                      backgroundColor: 'white', 
                      borderRadius: 6,
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>🏫</span>
                        <strong style={{ color: '#495057' }}>{exportSummary.class_info.display_name}</strong>
                      </div>
                      <small style={{ color: '#6c757d' }}>Selected Class</small>
                    </div>
                  )}
                  
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'white', 
                    borderRadius: 6,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>📋</span>
                      <strong style={{ color: '#495057' }}>{exportSummary.statistics.total_sessions} Sessions</strong>
                    </div>
                    <small style={{ color: '#6c757d' }}>{exportSummary.statistics.total_students} Students</small>
                  </div>
                  
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'white', 
                    borderRadius: 6,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>📊</span>
                      <strong style={{ color: '#495057' }}>{exportSummary.statistics.overall_attendance_rate}% Attendance</strong>
                    </div>
                    <small style={{ color: '#6c757d' }}>
                      {exportSummary.statistics.present_records} Present, {exportSummary.statistics.absent_records} Absent
                    </small>
                  </div>
                  
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'white', 
                    borderRadius: 6,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>🎯</span>
                      <strong style={{ color: '#495057' }}>{exportSummary.insights.data_quality} Data</strong>
                    </div>
                    <small style={{ color: '#6c757d' }}>Quality Assessment</small>
                  </div>
                </div>
              </div>
            )}

            {/* Export Format Options */}
            {exportSummary && (
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: 8, 
                padding: 20,
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>📁 Choose Export Format</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: 16 
                }}>
                  {exportSummary.export_options.map((option, index) => (
                    <div 
                      key={option.format} 
                      style={{ 
                        padding: 16, 
                        backgroundColor: 'white', 
                        borderRadius: 8,
                        border: option.recommended ? '2px solid #28a745' : '1px solid #e9ecef',
                        position: 'relative'
                      }}
                    >
                      {option.recommended && (
                        <div style={{ 
                          position: 'absolute', 
                          top: -8, 
                          right: 12, 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          RECOMMENDED
                        </div>
                      )}
                      <h5 style={{ margin: '0 0 8px 0', color: '#495057' }}>{option.name}</h5>
                      <p style={{ margin: '0 0 16px 0', color: '#6c757d', fontSize: 14 }}>
                        {option.description}
                      </p>
                      <button
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          backgroundColor: option.recommended ? '#28a745' : '#007bff', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 6,
                          cursor: exportLoading ? 'not-allowed' : 'pointer',
                          fontSize: 14,
                          fontWeight: 'bold',
                          opacity: exportLoading ? 0.6 : 1
                        }}
                        onClick={() => handleExport(option.format)}
                        disabled={exportLoading}
                      >
                        {exportLoading ? '⏳ Exporting...' : `📥 Download ${option.name.split(' ')[1]}`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!exportSummary && showExportPanel && (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                color: '#6c757d' 
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <p>Loading export preview...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
