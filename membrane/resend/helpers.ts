import { state } from "membrane";

export function status() {
  return state.API_KEY
    ? "Configured"
    : "Please [configure](:configure) your [API key](https://resend.com/api-keys)";
}

export async function configure({ apiKey }: { apiKey: string }) {
  if (!apiKey) {
    throw new Error("Please provide a valid API key");
  }
  state.API_KEY = apiKey;
}

const BASE_URL = "https://api.resend.com";
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export async function api(
  method: Method,
  path: string,
  query?: Record<string, any>,
  body?: any
) {
  const url = new URL(`${BASE_URL}/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${state.API_KEY}`,
    "Content-Type": "application/json",
  };

  if (body !== undefined) {
    body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text();
  }
}
