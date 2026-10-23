import axios from 'axios';

// Safely extract the raw URL, stripping accidental Markdown formatting or quotes
const getBaseUrl = () => {
  let rawUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof rawUrl === 'string') {
    const match = rawUrl.match(/(https?:\/\/[^\s)\]'"]+)/);
    if (match) return match[0];
  }
  // Fallback to localhost for local admin development
  return 'http://localhost:5000';
};

const API = axios.create({
  baseURL: getBaseUrl(),
  // withCredentials is left off since you are using Bearer tokens in headers
});

// Intercept every request to inject the correct admin bearer token
API.interceptors.request.use(
  (config) => {
    const token = 
      localStorage.getItem('beautyvibe_admin_token') || 
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
      console.warn("Admin API Request unauthorized (401). Please check admin session.");
    }
    return Promise.reject(error);
  }
);

export default API;