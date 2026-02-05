// API configuration
// In development, Vite proxies /api to the backend
// In production, we use the full API URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
