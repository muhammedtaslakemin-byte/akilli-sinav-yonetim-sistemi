/**
 * Merkezi API İstemcisi
 * Tüm fetch çağrıları buradan yapılır. Base URL .env'den okunur.
 * Kullanım: api.get('/auth/me', token), api.post('/auth/login', {}, body), api.upload('/path', formData, token)
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

async function request<T>(
  method: Method,
  path: string,
  token?: string | null,
  body?: unknown
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? `HTTP ${res.status}: ${path}`);
  }

  return data as T;
}

export const api = {
  get:    <T>(path: string, token?: string | null)                                => request<T>('GET',    path, token),
  post:   <T>(path: string, body: unknown, token?: string | null)                 => request<T>('POST',   path, token, body),
  upload: <T>(path: string, formData: FormData, token?: string | null)            => request<T>('POST',   path, token, formData),
  put:    <T>(path: string, body: unknown, token?: string | null)                 => request<T>('PUT',    path, token, body),
  delete: <T>(path: string, token?: string | null)                                => request<T>('DELETE', path, token),
};
