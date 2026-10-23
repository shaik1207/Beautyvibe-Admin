import axios from 'axios';

// Safely extract the raw URL, stripping accidental Markdown formatting or quotes
const getBaseUrl = () => {
  let rawUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof rawUrl === 'string') {
    const match = rawUrl.match(/(https?:\/\/[^\s)\]'"]+)/);
    if (match) return match[0];
  }
  return 'http://localhost:5000';
};

const API = axios.create({
  baseURL: getBaseUrl(),
});

// Intercept every request to inject the correct bearer token
API.interceptors.request.use(
  (config) => {
    // Check all possible token keys used across your app
    const token = 
      localStorage.getItem('beautyvibe_admin_token') || 
      localStorage.getItem('beautyvibe_user_token') || 
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }, 
  (error) => Promise.reject(error)
);

// Response error interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("API Request unauthorized (401). Clearing invalid session.");
      // Optional: Clear corrupted tokens on 401
      // localStorage.removeItem('beautyvibe_admin_token');
    }
    return Promise.reject(error);
  }
);

export default API;