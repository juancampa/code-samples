/**
 * Driver for the fly.io API
 */
import { state, root, resolvers } from "membrane";
import { api } from "./helpers";

export interface State {
  token?: string;
}

export const Root: resolvers.Root = {
  configure: ({ token }) => {
    state.token = token;
    root.statusChanged.$emit();
  },

  status: () => (state.token ? "Ready" : "[Configure API token](:configure)"),

  // https://fly.io/docs/machines/api/apps-resource/
  apps: () => ({}),
};

export const App: resolvers.App = {
  gref: (_, { obj }) => root.apps.one({ name: obj.name }),
};

// TODO: the returned object representing an app is slightly different
// for one, page, and create
export const AppsCollection: resolvers.AppsCollection = {
  // https://fly.io/docs/machines/api/apps-resource/#get-app-details
  one: ({ name }) => api({ method: "GET", path: `/apps/${name}` }),

  // https://fly.io/docs/machines/api/apps-resource/#list-apps-in-an-organization
  page: async ({ org_slug }) => {
    const path = `/apps?org_slug=${org_slug}`;
    const { apps, total_apps } = await api({ method: "GET", path });
    return { items: apps, next: null };
  },

  // https://fly.io/docs/machines/api/apps-resource/#create-a-fly-app
  create: async ({ name, org_slug }) => {
    const body = { app_name: name, org_slug };
    const app: any = await api({ method: "POST", path: "/apps", body });
    const { id, created_at } = app;
    return { id, name, organization: { slug: org_slug } };
  },

  // https://fly.io/docs/machines/api/apps-resource/#delete-a-fly-app
  delete: ({ name }) => api({ method: "DELETE", path: `/apps/${name}` }),
};
