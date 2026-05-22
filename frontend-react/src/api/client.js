import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Auth header interceptor
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

export default client;
export { BASE };
