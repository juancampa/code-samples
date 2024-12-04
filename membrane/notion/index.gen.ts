import { state, root, nodes } from "membrane";
import {
  getSelfGref,
  api as _api,
} from "./index.custom";
async function api(
  method: string,
  path: string,
  query?: any,
  body?: string
): Promise<any> {
  return _api(method, path, query, body);
}
export const Root = {
  blocks: () => ({}),
  databases: () => ({}),
  pages: () => ({}),
  users: () => ({}),
  status() {
    if (!state.token) {
      return `Please [configure](:configure) your Notion [API secret](https://developers.notion.com/docs/create-a-notion-integration#get-your-api-secret)`;
    } else {
      return `Ready`;
    }
  },
  configure: ({ token }) => {
    state.token = token;
  },
  tests: () => ({}),
};
export const Tests = {
  testSearchEndpoint: async () => {
    const res = await api(
      "POST",
      "v1/search",
      null,
      JSON.stringify({
        filter: {
          value: "page",
          property: "object",
        },
      })
    );
    const items = await res.json();
    return Array.isArray(items.results);
  },
};
export const Block = {
  gref: (_, { obj, self }) => {
    return getSelfGref(obj, "Block", self);
  },
  paragraph: async (_, { obj }) => {
    const val = obj["paragraph"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
};
export const Database = {
  gref: (_, { obj, self }) => {
    return getSelfGref(obj, "Database", self);
  },
  properties: async (_, { obj }) => {
    const val = obj["properties"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
  title: async (_, { obj }) => {
    const items = obj["title"];
    if (items) {
      return items.map((e: any) => JSON.stringify(e));
    }
  },
};
export const Page = {
  gref: (_, { obj, self }) => {
    return getSelfGref(obj, "Page", self);
  },
  parent: async (_, { obj }) => {
    const val = obj["parent"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
  properties: async (_, { obj }) => {
    const val = obj["properties"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
  appendBlock: async ({ children }, { self }) => {
    const { id } = self.$argsAt(root.pages.one);
    const res = await api(
      "PATCH",
      `v1/blocks/${id}/children`,
      null,
      JSON.stringify(children)
    );
    return await res.json();
  },
};
export const User = {
  gref: (_, { obj, self }) => {
    return getSelfGref(obj, "User", self);
  },
  avatar_url: async (_, { obj }) => {
    const val = obj["avatar_url"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
  person: async (_, { obj }) => {
    const val = obj["person"];
    return typeof val === "string" ? val : JSON.stringify(val);
  },
};
export const BlockCollection = {
  one: async (args) => {
    const res = await api("GET", `v1/blocks/${args.id}`);
    return await res.json();
  },
};
export const DatabaseCollection = {
  one: async (args) => {
    const res = await api("GET", `v1/databases/${args.id}`);
    return await res.json();
  },
};
export const PageCollection = {
  one: async (args) => {
    const res = await api("GET", `v1/pages/${args.id}`);
    return await res.json();
  },
};
export const UserCollection = {
  one: async (args) => {
    const res = await api("GET", `v1/users/${args.id}`);
    return await res.json();
  },
};
