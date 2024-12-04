import { state } from "membrane";

const BASE_URL = "https://api.machines.dev/v1";

export async function api(args: {
  method: string;
  path: string;
  body?: any;
}): Promise<any> {
  const { method, path, body = {} } = args;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  // DELETE: fly.io/docs/machines/api/apps-resource/#delete-a-fly-app
  if (response.status === 202) return;

  // Return body for GETs and POSTs
  return response.json();
}
