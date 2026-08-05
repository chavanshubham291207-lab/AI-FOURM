import axios from 'axios';

// Support VITE_API_URL environment variable for cross-origin deployments (e.g. Vercel frontend + Render backend)
const rawBaseURL = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBaseURL.replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT authorization header and fix FormData Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ai_forum_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When sending FormData, delete fixed Content-Type so browser/Axios automatically sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic error extraction
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
