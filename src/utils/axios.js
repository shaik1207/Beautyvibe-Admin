import axios from "axios";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

// --------------------------------------------------
// API BASE URL
// --------------------------------------------------

const getBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof rawUrl === "string" && rawUrl.trim()) {
    const cleanedUrl = rawUrl
      .trim()
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/\/+$/, "");

    if (/^https?:\/\/[^\s]+$/i.test(cleanedUrl)) {
      return cleanedUrl;
    }
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
  timeout: 30000,
  headers: {
    Accept: "application/json",
    // NOTE: Removed global "Content-Type": "application/json" 
    // so FormData requests can automatically attach multipart/form-data boundaries!
  },
});

// --------------------------------------------------
// REQUEST INTERCEPTOR
// --------------------------------------------------

API.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};

      // If data is FormData, let the browser set the multipart/form-data boundary automatically
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      } else if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }

      // 1. Check localStorage first for backend JWT tokens
      const localToken = 
        localStorage.getItem("beautyvibe_user_token") || 
        localStorage.getItem("beautyvibe_admin_token");

      if (localToken) {
        config.headers.Authorization = `Bearer ${localToken}`;
        return config;
      }

      // 2. Fallback to Firebase Auth user token if no local token exists
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
// RESPONSE INTERCEPTOR
// --------------------------------------------------

API.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message || error.message;

      console.error("API Response Error:", {
        status,
        message,
        url: error.config?.url,
      });

      switch (status) {
        case 401:
          if (!error.config?.url?.includes("/api/auth/login")) {
            localStorage.removeItem("beautyvibe_user_token");
            localStorage.removeItem("beautyvibe_admin_token");
          }
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default API;