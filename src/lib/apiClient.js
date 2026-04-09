import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token or guestId on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const guestId = localStorage.getItem('guestId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (guestId) {
    config.headers['X-Guest-Id'] = guestId;
  }

  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('guestId');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
