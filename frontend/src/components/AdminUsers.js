import React, { useState } from 'react';
import { RequireAuth } from '../AuthContext';
import TeacherList from './TeacherList';
import UserCreationForm from './UserCreationForm';

function AdminUsersInner() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUserCreated = () => {
    // Trigger refresh of teacher list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{ 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem'
    }}>
      {/* Header */}
      <div>
        <h2 style={{ 
          color: '#2c3e50', 
          marginBottom: '0.5rem', 
          fontSize: '2rem', 
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          👑 Administrator Panel
        </h2>
        <p style={{
          margin: 0,
          color: '#7f8c8d',
          fontSize: '1rem'
        }}>
          Manage system users, roles, and permissions
        </p>
      </div>

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Left Column - User Creation */}
        <UserCreationForm onUserCreated={handleUserCreated} />
        
        {/* Right Column - Teacher List */}
        <TeacherList onRefresh={refreshTrigger} />
      </div>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <RequireAuth roles={['superadmin']}>
      <AdminUsersInner />
    </RequireAuth>
  );
}




