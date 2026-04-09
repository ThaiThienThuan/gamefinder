import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      // Try existing token
      const token = localStorage.getItem('token');
      const guestId = localStorage.getItem('guestId');

      if (token || guestId) {
        const res = await apiClient.get('/api/auth/me');
        setUser(res.data.data);
      } else {
        // Auto-create guest session
        await createGuest();
      }
    } catch (err) {
      // Token invalid, create new guest
      localStorage.removeItem('token');
      await createGuest();
    } finally {
      setLoading(false);
    }
  }

  async function createGuest() {
    try {
      const res = await apiClient.post('/api/auth/guest');
      const { user, guestId } = res.data.data;
      localStorage.setItem('guestId', guestId);
      setUser(user);
    } catch (err) {
      console.error('Failed to create guest session:', err);
    }
  }

  return { user, loading, createGuest };
}
