
// When VITE_API_BASE_URL is empty, requests go through the Vite proxy (dev).
// When set (e.g. "http://localhost:8080"), requests go directly to the backend.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  code: string | undefined;
  message: string;
  status: number;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.message = message;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Converts raw fetch errors into user-friendly messages.
 * "Failed to fetch" typically means CORS or the backend is down.
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Unable to reach the server. Make sure the backend is running.';
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const officerId = localStorage.getItem('officer_id');

  const headers = new Headers(options?.headers);
  if (officerId) {
    headers.set('X-Officer-Id', officerId);
  }

  if (options?.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: { error?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      response.status,
      errorData.error ?? response.statusText,
      response.status.toString()
    );
  }

  if (response.status === 204) {
    // 204 No Content
    return undefined as T;
  }
  return response.json();
}
