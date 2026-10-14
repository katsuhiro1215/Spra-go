const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost";

// どのアプリからの通信かをサーバーに伝える(使っているアプリの記録用。docs/design/2026-10-14-multi-app-accounts-design.md 5章)
const APP_KEY = "go";

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureCsrfCookie() {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include" });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Spra-App", APP_KEY);

  if (method !== "GET") {
    await ensureCsrfCookie();
    headers.set("Content-Type", "application/json");
    const token = getCookie("XSRF-TOKEN");
    if (token) headers.set("X-XSRF-TOKEN", token);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}

export { API_URL };
