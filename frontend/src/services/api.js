import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://crm-core-v1-production.up.railway.app",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function register(data) {
  const { data: result } = await api.post("/api/v1/auth/register", data);
  localStorage.setItem("crm_access_token", result.access_token);
  localStorage.setItem("crm_user", JSON.stringify(result.user));
  localStorage.setItem("crm_business", JSON.stringify(result.business));
  return result;
}

export async function login(data) {
  const { data: result } = await api.post("/api/v1/auth/login", data);
  localStorage.setItem("crm_access_token", result.access_token);
  localStorage.setItem("crm_user", JSON.stringify(result.user));
  localStorage.setItem("crm_business", JSON.stringify(result.business));
  return result;
}

export function logout() {
  localStorage.removeItem("crm_access_token");
  localStorage.removeItem("crm_user");
  localStorage.removeItem("crm_business");
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.dispatchEvent(new Event("crm:unauthorized"));
    }
    return Promise.reject(error);
  }
);
