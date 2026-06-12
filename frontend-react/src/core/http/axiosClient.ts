import axios from "axios";
import { useAuthStore } from "../../features/auth/store/authStore";
import { env } from "../config/env";

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  // Évite les requêtes qui pendent indéfiniment : au-delà, l'erreur est
  // traduite en « Le serveur met trop de temps à répondre » par
  // getApiErrorMessage (code ECONNABORTED).
  timeout: 30000,
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  config.headers = config.headers ?? {};

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (data?.errorMessage && !data.message) {
      data.message = data.errorMessage;
    }
    if (error?.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  }
);
