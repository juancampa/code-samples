import { state, nodes, root } from "membrane";
import { Octokit } from "@octokit/rest";
import parseLinks from "./parse-link-header";

const baseUrl = "https://api.machines.dev/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

state.webhooks = state.webhooks ?? {};

async function api(
  method: Method,
  path: string,
  query?: any,
  body?: string | object
) {
  if (!state.API_KEY) {
    throw new Error("You must be authenticated to use this API.");
  }

  const queryString = query ? `?${new URLSearchParams(query)}` : "";
  const url = `${baseUrl}/${path}${queryString}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${state.API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const Root = {
  status() {
    return state.API_KEY ? "Configured" : "Not configured";
  },
  apps: () => ({}),
  configure: async ({ apiKey }) => {
    state.API_KEY = apiKey;
  },
  parse: async ({ name, value }) => {
    switch (name) {
      case "app":
        return [root.apps.one({ app_name: value })];
      default:
        return [];
    }
  },
};

export const Tests = {
  testGetApps: async () => {
    const apps = await root.apps.page({ org_slug: "test-org" }).$query(`{ items { name } }`);
    return Array.isArray(apps.items);
  },
};

export const AppCollection = {
  async one({ app_name }) {
    return await api("GET", `apps/${app_name}`);
  },
  async page({ org_slug, cursor, limit = 10 }) {
    const response = await api("GET", "apps", { org_slug, cursor, limit });
    return {
      items: response.apps,
      next: response.next_cursor ? self.page({ org_slug, cursor: response.next_cursor, limit }) : null,
    };
  },
  async create({ name, org_slug, network, enable_subdomains }) {
    return await api("POST", "apps", null, { name, org_slug, network, enable_subdomains });
  },
};

export const App = {
  gref: (_, { obj }) => root.apps.one({ app_name: obj.name }),
  async delete(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    await api("DELETE", `apps/${app_name}`);
  },
  machines: () => ({}),
  volumes: () => ({}),
  secrets: () => ({}),
};

export const MachineCollection = {
  async one({ machine_id }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    return await api("GET", `apps/${app_name}/machines/${machine_id}`);
  },
  async page({ include_deleted, region, summary, cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const response = await api("GET", `apps/${app_name}/machines`, { include_deleted, region, summary, cursor, limit });
    return {
      items: response.machines,
      next: response.next_cursor ? self.page({ include_deleted, region, summary, cursor: response.next_cursor, limit }) : null,
    };
  },
  async create({ config, name, region, skip_launch, skip_service_registration }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    return await api("POST", `apps/${app_name}/machines`, null, { config, name, region, skip_launch, skip_service_registration });
  },
};

export const Machine = {
  gref: (_, { obj }) => root.apps.one({ app_name: obj.app }).machines.one({ machine_id: obj.id }),
  async update({ config }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    return await api("POST", `apps/${app_name}/machines/${machine_id}`, null, { config });
  },
  async delete({ force }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("DELETE", `apps/${app_name}/machines/${machine_id}`, { force });
  },
  async start(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/start`);
  },
  async stop({ signal, timeout }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/stop`, null, { signal, timeout });
  },
  async restart({ signal, timeout }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/restart`, null, { signal, timeout });
  },
  async signal({ signal }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/signal`, null, { signal });
  },
  async exec({ command, timeout }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    return await api("POST", `apps/${app_name}/machines/${machine_id}/exec`, null, { command, timeout });
  },

  async cordon(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/cordon`);
  },
  async uncordon(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/uncordon`);
  },
  async suspend(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("POST", `apps/${app_name}/machines/${machine_id}/suspend`);
  },
  async wait({ state, timeout }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    await api("GET", `apps/${app_name}/machines/${machine_id}/wait`, { state, timeout });
  },
  events: () => ({}),
  processes: () => ({}),
  versions: () => ({}),
};

export const MachineEventCollection = {
  async page({ cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    const response = await api("GET", `apps/${app_name}/machines/${machine_id}/events`, { cursor, limit });
    return {
      items: response.events,
      next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
    };
  },
};

export const ProcessCollection = {
  async page({ sort_by, order, cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    const response = await api("GET", `apps/${app_name}/machines/${machine_id}/ps`, { sort_by, order, cursor, limit });
    return {
      items: response.processes,
      next: response.next_cursor ? self.page({ sort_by, order, cursor: response.next_cursor, limit }) : null,
    };
  },
};

export const MachineVersionCollection = {
  async page({ cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { machine_id } = self.$argsAt(root.apps.one.machines.one);
    const response = await api("GET", `apps/${app_name}/machines/${machine_id}/versions`, { cursor, limit });
    return {
      items: response.versions,
      next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
    };
  },
};

export const VolumeCollection = {
  async one({ volume_id }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    return await api("GET", `apps/${app_name}/volumes/${volume_id}`);
  },
  async page({ summary, cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const response = await api("GET", `apps/${app_name}/volumes`, { summary, cursor, limit });
    return {
      items: response.volumes,
      next: response.next_cursor ? self.page({ summary, cursor: response.next_cursor, limit }) : null,
    };
  },
  async create({ name, region, size_gb, encrypted, require_unique_zone, snapshot_id, source_volume_id }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    return await api("POST", `apps/${app_name}/volumes`, null, { name, region, size_gb, encrypted, require_unique_zone, snapshot_id, source_volume_id });
  },
};

export const Volume = {
  gref: (_, { obj }) => root.apps.one({ app_name: obj.app }).volumes.one({ volume_id: obj.id }),
  async update({ name }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { volume_id } = self.$argsAt(root.apps.one.volumes.one);
    return await api("PUT", `apps/${app_name}/volumes/${volume_id}`, null, { name });
  },
  async delete(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { volume_id } = self.$argsAt(root.apps.one.volumes.one);
    await api("DELETE", `apps/${app_name}/volumes/${volume_id}`);
  },
  async extend({ size_gb }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { volume_id } = self.$argsAt(root.apps.one.volumes.one);
    return await api("PUT", `apps/${app_name}/volumes/${volume_id}/extend`, null, { size_gb });
  },
  snapshots: () => ({}),
};

export const VolumeSnapshotCollection = {
  async page({ cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { volume_id } = self.$argsAt(root.apps.one.volumes.one);
    const response = await api("GET", `apps/${app_name}/volumes/${volume_id}/snapshots`, { cursor, limit });
    return {
      items: response.snapshots,
      next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
    };
  },
  async create(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { volume_id } = self.$argsAt(root.apps.one.volumes.one);
    await api("POST", `apps/${app_name}/volumes/${volume_id}/snapshots`);
  },
};

export const SecretCollection = {
  async page({ cursor, limit = 10 }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const response = await api("GET", `apps/${app_name}/secrets`, { cursor, limit });
    return {
      items: response.secrets,
      next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
    };
  },
  async create({ name, value, type }, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    await api("POST", `apps/${app_name}/secrets/${name}/type/${type}`, null, { value });
  },
};

export const Secret = {
  gref: (_, { obj }) => root.apps.one({ app_name: obj.app }).secrets.one({ name: obj.name }),
  async delete(_, { self }) {
    const { app_name } = self.$argsAt(root.apps.one);
    const { name } = self.$argsAt(root.apps.one.secrets.one);
    await api("DELETE", `apps/${app_name}/secrets/${name}`);
  },
};

export async function endpoint({ path, body }) {
  if (path === "/webhook") {
    const event = JSON.parse(body);
    await dispatchEvent(event.resource_id, event.type);
  }
}

async function dispatchEvent(resourceId: string, eventType: string) {
  const resource = root.apps.one({ app_name: resourceId });
  await resource.changed.$emit({ type: eventType });
}

export async function refreshWebhook({ id }) {
  await api("POST", `webhooks/${id}/refresh`);
}