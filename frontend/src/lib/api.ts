const defaultApiUrl = "http://localhost:3001/api";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? defaultApiUrl;

type ApiErrorPayload = {
  message?: string | string[];
};

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ApiErrorPayload
      | null;
    const message = Array.isArray(payload?.message)
      ? payload?.message.join(", ")
      : payload?.message || "Request failed.";

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiRequestWithToken<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
}
