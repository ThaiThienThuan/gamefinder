import { useCallback, useState } from 'react';
import apiClient from '../lib/apiClient';

export function useLiveKit() {
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestToken = useCallback(async ({ roomId, participantName }) => {
    if (!roomId) {
      setError('roomId is required');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/livekit/token', {
        roomId,
        participantName
      });
      const { token: t, url } = res.data?.data || {};
      setToken(t || null);
      setServerUrl(url || import.meta.env.VITE_LIVEKIT_URL || null);
      return { token: t, url };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setServerUrl(null);
    setError(null);
  }, []);

  return { token, serverUrl, loading, error, requestToken, reset };
}
