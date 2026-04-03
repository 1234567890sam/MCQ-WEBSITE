import axios from "axios";

// 🔥 Use environment variable (Production)
// Fallback for local development
const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {},
});

// ── Request Interceptor: Attach access token ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto-refresh & Retry ───────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // ── 1. Handle 401 Token Expired ───────────────────────────────────────────
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("[Axios] Access token expired, attempting refresh...");
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 20000 } // Long timeout for spin-up
        );

        const newToken = data.accessToken;
        localStorage.setItem("accessToken", newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("[Axios] Refresh token failed or expired. Redirecting to login.");
        processQueue(err, null);
        localStorage.removeItem("accessToken");
        // Only redirect if we are not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 2. Handle Retries for 5xx or Network Errors ───────────────────────────
    // Don't retry if it's a 4xx (except 401 handled above) or if it's already retried 3 times
    const shouldRetry = (!error.response || error.response.status >= 500) && (!originalRequest._retryCount || originalRequest._retryCount < 3);

    if (shouldRetry) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delay = originalRequest._retryCount * 2000; // Exponential backoff starts at 2s
      console.warn(`[Axios] Request failed (${error.message}). Retrying ${originalRequest._retryCount}/3 in ${delay}ms...`);
      
      return new Promise(resolve => setTimeout(resolve, delay)).then(() => api(originalRequest));
    }

    return Promise.reject(error);
  }
);

export default api;