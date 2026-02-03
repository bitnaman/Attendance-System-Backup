import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

// Hard reset detection - tracks rapid reloads
const RELOAD_THRESHOLD = 3;
const RELOAD_WINDOW_MS = 5000; // 5 seconds window for detecting rapid reloads

function checkAndHandleRapidReloads() {
  const now = Date.now();
  const reloadKey = 'rapid_reload_timestamps';
  
  try {
    // Get existing reload timestamps
    const existingData = sessionStorage.getItem(reloadKey);
    let timestamps = existingData ? JSON.parse(existingData) : [];
    
    // Filter to only keep timestamps within the window
    timestamps = timestamps.filter(ts => now - ts < RELOAD_WINDOW_MS);
    
    // Add current timestamp
    timestamps.push(now);
    
    // Save back
    sessionStorage.setItem(reloadKey, JSON.stringify(timestamps));
    
    // Check if threshold exceeded
    if (timestamps.length >= RELOAD_THRESHOLD) {
      console.log('🔄 Rapid reload detected! Performing hard reset...');
      performHardReset();
      return true;
    }
  } catch (e) {
    console.error('Error checking rapid reloads:', e);
  }
  
  return false;
}

function performHardReset() {
  // Clear all localStorage
  localStorage.clear();
  
  // Clear all sessionStorage
  sessionStorage.clear();
  
  // Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
  
  // Force reload from server
  window.location.href = window.location.origin + window.location.pathname;
}

// Check for rapid reloads on module load
const rapidReloadTriggered = checkAndHandleRapidReloads();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // If rapid reload was just triggered, start fresh
    if (rapidReloadTriggered) return null;
    return localStorage.getItem('auth_token') || null;
  });
  const [user, setUser] = useState(() => {
    if (rapidReloadTriggered) return null;
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('auth_user', JSON.stringify(user));
    else localStorage.removeItem('auth_user');
  }, [user]);

  const login = (newToken, userInfo) => {
    // Clear rapid reload tracking on successful login
    sessionStorage.removeItem('rapid_reload_timestamps');
    setToken(newToken);
    setUser(userInfo || null);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Clear all cookies and session storage
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Hard refresh to clear all cached data
    window.location.reload(true);
  };

  // Expose hard reset function for manual triggering
  const hardReset = performHardReset;

  const value = useMemo(() => ({ token, user, login, logout, hardReset }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children, roles }) {
  const { token, user } = useAuth();
  const roleOk = !roles || (user && roles.includes(user.role));
  if (!token || !roleOk) {
    return <div style={{ padding: 24 }}>Unauthorized. Please log in{roles ? ` with role: ${roles.join(', ')}` : ''}.</div>;
  }
  return children;
}




