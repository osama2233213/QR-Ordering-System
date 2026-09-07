import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5050/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication headers
axiosClient.interceptors.request.use(
  (config) => {
    // 1. Staff / Admin JWT: attach Authorization header if token exists
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Customer Guest Session: attach x-session-token if present
    const guestToken = localStorage.getItem("guest_session_token");
    if (guestToken && !config.headers["x-session-token"]) {
      // Discriminate routes: only attach guest session token to guest/public customer endpoints.
      // Do not leak guest session token to staff/admin routes.
      const url = config.url || "";
      const isStaffAdminRoute =
        url.startsWith("/auth") ||
        url.startsWith("/devgate") ||
        url.startsWith("/restaurant") ||
        url.startsWith("/categories") ||
        url.startsWith("/menu-items") ||
        (url.startsWith("/menu") && !url.includes("/public/")) ||
        (url === "/orders" && config.method === "get") ||
        (url.includes("/status") && config.method === "patch" && !url.startsWith("/session/status"));

      if (!isStaffAdminRoute) {
        config.headers["x-session-token"] = guestToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosClient;
