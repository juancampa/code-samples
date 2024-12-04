import { state, nodes, root } from "membrane";

state.token ??= null;

export const Root = {
  async museumHours() {
    const res = await api("GET", "museum-hours");
    return await res.json();
  },
  async specialEvents() {
    const res = await api("GET", "special-events");
    return await res.json();
  },
  async ticketPurchase(body) {
    const res = await api("POST", "tickets", body);
    return await res.json();
  },
};

export const Tests = {
  async testMuseumHours() {
    const hours = await Root.museumHours();
    return hours.hours.length > 0;
  },
  async testSpecialEvents() {
    const events = await Root.specialEvents();
    return events.events.length > 0;
  },
};

export const SpecialEventCollection = {
  async one({ eventId }) {
    const res = await api("GET", `special-events/${eventId}`);
    return await res.json();
  },
  async page(args) {
    const res = await api("GET", "special-events");
    return await res.json();
  },
};

export const SpecialEvent = {
  async gref(_, { obj }) {
    return obj.id;
  },
};

export const ActionCollection = {
  async createSpecialEvent(body) {
    const res = await api("POST", "special-events", body);
    return await res.json();
  },
  async updateSpecialEvent({ eventId, body }) {
    const res = await api("PATCH", `special-events/${eventId}`, body);
    return await res.json();
  },
  async deleteSpecialEvent({ eventId }) {
    await api("DELETE", `special-events/${eventId}`);
  },
};

export async function api(method: string, path: string, body?: any) {
  const res = await fetch(`https://redocly.com/_mock/docs/openapi/museum-api/${path}`, {
    method,
    headers: {
      "Authorization": "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API call failed: ${res.status} ${res.statusText}`);
  }

  return res;
}