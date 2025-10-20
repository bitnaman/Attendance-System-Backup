import React, { useEffect, useState } from 'react';
import { downloadClassCsv, downloadStudentCsv, downloadStudentPdf, fetchExportClasses, fetchStudentsFiltered } from '../api';

export default function ExportPanel() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [division, setDivision] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchExportClasses();
        setClasses(data.classes || []);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!classId) { setStudents([]); setStudentId(''); return; }
      try {
        const data = await fetchStudentsFiltered(classId, division || undefined, 1, 200);
        setStudents(data.students || []);
      } catch (e) {}
    })();
  }, [classId, division]);

  return (
    <div style={{ padding: 16 }}>
      <h3>Exports</h3>
      <div style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name || `${c.name} - ${c.section}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Division</label>
            <input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div>
          <label>Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!students.length}>
            <option value="">-- Select Student --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (Roll {s.roll_no})</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => downloadClassCsv(classId, division || undefined, dateFrom || undefined, dateTo || undefined)} disabled={!classId}>Download Class CSV</button>
          <button onClick={() => downloadStudentCsv(studentId, dateFrom || undefined, dateTo || undefined)} disabled={!studentId}>Download Student CSV</button>
          <button onClick={() => downloadStudentPdf(studentId, dateFrom || undefined, dateTo || undefined)} disabled={!studentId} style={{ backgroundColor: '#dc3545', color: 'white' }}>Download Student PDF</button>
        </div>
      </div>
    </div>
  );
}




