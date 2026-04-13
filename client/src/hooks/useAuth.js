import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/api/auth/me');
      setUser(res.data.data);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const register = useCallback(async ({ username, email, password }) => {
    const res = await apiClient.post('/api/auth/register', { username, email, password });
    const { token, user: u } = res.data.data;
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const res = await apiClient.post('/api/auth/login', { username, password });
    const { token, user: u } = res.data.data;
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return { user, loading, register, login, logout };
}
