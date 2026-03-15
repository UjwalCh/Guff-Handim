import axios from 'axios';
import { useAdminStore } from '../store/adminStore';
import { API_BASE_URL } from './runtimeConfig';

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAdminStore.getState().clearAdminAuth();
    }
    return Promise.reject(err);
  }
);

export default adminApi;
