import React, { useState } from 'react';
import { RequireAuth } from '../AuthContext';
import TeacherList from './TeacherList';
import UserCreationForm from './UserCreationForm';
import '../styles/user-profile.css';

function AdminUsersInner() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUserCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <h2>👑 Administrator Panel</h2>
        <p>Manage system users, roles, and permissions</p>
      </div>

      <div className="admin-users-grid">
        <UserCreationForm onUserCreated={handleUserCreated} />
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




