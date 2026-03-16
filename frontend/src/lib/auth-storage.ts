const accessTokenKey = "teamflow.accessToken";
const userKey = "teamflow.user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export function persistAuthSession(payload: AuthResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(accessTokenKey, payload.accessToken);
  window.localStorage.setItem(userKey, JSON.stringify(payload.user));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(userKey);
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(accessTokenKey);
}
