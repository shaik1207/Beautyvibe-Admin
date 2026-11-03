import axios from "axios";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

// --------------------------------------------------
// API BASE URL
// --------------------------------------------------

const getBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (typeof rawUrl === "string" && rawUrl.trim()) {
    const cleanedUrl = rawUrl
      .trim()
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/\/+$/, "");

    if (/^https?:\/\/[^\s]+$/i.test(cleanedUrl)) {
      return cleanedUrl;
    }
  }

  // In production, fallback directly to the live Render backend instead of localhost
  if (import.meta.env.PROD) {
    console.warn("⚠️ VITE_API_BASE_URL is missing in Vercel. Defaulting to live Render backend.");
    return "https://beautyvibe-backend.onrender.com";
  }

  // Local development fallback
  return "http://localhost:5000";
};

// --------------------------------------------------
// WAIT FOR FIREBASE AUTH INITIALIZATION
// --------------------------------------------------

let authReadyPromise = null;

const waitForAuthReady = () => {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          console.error("Firebase auth initialization error:", error);
          resolve(null);
        }
      );
    });
  }

  return authReadyPromise;
};

// --------------------------------------------------
// AXIOS INSTANCE
// --------------------------------------------------

const API = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000, // Increased to 60s to safely handle Render cold starts
  withCredentials: true,
  headers: {
    Accept: "application/json",
    // NOTE: Content-Type is omitted globally so FormData requests 
    // can automatically attach multipart/form-data boundaries.
  },
});

// --------------------------------------------------
// REQUEST INTERCEPTOR
// --------------------------------------------------

API.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};

      // If data is FormData, let the browser handle the multipart boundary
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      } else if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }

      // 1. Check localStorage first (Prioritize Admin token for the admin dashboard)
      const adminToken = 
        localStorage.getItem("beautyvibe_admin_token") || 
        localStorage.getItem("beautyvibe_user_token") ||
        localStorage.getItem("token");

      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
        return config;
      }

      // 2. Fallback to Firebase Auth token if no local token exists
      const currentUser = await waitForAuthReady();

      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }

      return config;
    } catch (error) {
      console.error("Request interceptor token error:", error);
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

// --------------------------------------------------
// RESPONSE INTERCEPTOR WITH COLD-START AUTO-RETRY
// --------------------------------------------------

API.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Check if it's a network error or timeout (likely a Render cold start) and we haven't retried yet
    const isColdStartOrNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    if (isColdStartOrNetworkError && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn("⏳ Render backend is waking up from a cold start. Retrying admin request in 5 seconds...");
      
      // Wait 5 seconds for Render to spin up, then retry the request automatically
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return API(originalRequest);
    }

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      const requestUrl = error.config?.url || "";

      console.error("API Response Error:", {
        status,
        message,
        url: requestUrl,
      });

      // Handle unauthorized session expiration
      if (status === 401) {
        // Do not clear tokens if the failure happened during a login endpoint
        const isLoginEndpoint = 
          requestUrl.includes("/login") || 
          requestUrl.includes("/auth");

        if (!isLoginEndpoint) {
          localStorage.removeItem("beautyvibe_admin_token");
          localStorage.removeItem("beautyvibe_user_token");
          localStorage.removeItem("token");
        }
      }
    } else {
      console.error("Network or CORS error. Check VITE_API_BASE_URL and backend CORS policy.");
    }

    return Promise.reject(error);
  }
);

export default API;