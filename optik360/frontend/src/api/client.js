import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('o360_token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

export default client;
