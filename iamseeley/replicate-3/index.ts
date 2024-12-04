import { state, root } from "membrane";

const baseUrl = "https://api.replicate.com/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

state.webhooks = state.webhooks ?? {};

export const Root = {
  status: () => state.API_TOKEN ? "Configured" : "Please configure the API token",
  configure: async ({ apiToken }: { apiToken: string }) => {
    if (!apiToken) {
      throw new Error("Please provide a valid API token");
    }
    state.API_TOKEN = apiToken;
    return "Configuration completed successfully.";
  },
  account: async () => {
    const data = await api("GET", "account");
    return { ...data, ...Account };
  },
  collections: () => CollectionCollection,
  deployments: () => DeploymentCollection,
  hardware: () => HardwareCollection,
  models: () => ModelCollection,
  predictions: () => PredictionCollection,
  trainings: () => TrainingCollection,
  tests: () => Tests,
};

export const Account = {
  gref: () => root.account,
};

export const CollectionCollection = {
  one: async ({ slug }: { slug: string }) => {
    const data = await api("GET", `collections/${slug}`);
    return { ...data, ...Collection };
  },
  page: async ({ cursor }: { cursor?: string }) => {
    const data = await api("GET", "collections", { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Collection })),
      next: data.next ? () => CollectionCollection.page({ cursor: data.next }) : null,
    };
  },
};

export const Collection = {
  gref: (_, { obj }) => root.collections.one({ slug: obj.slug }),
};

export const DeploymentCollection = {
  one: async ({ owner, name }: { owner: string; name: string }) => {
    const data = await api("GET", `deployments/${owner}/${name}`);
    return { ...data, ...Deployment };
  },
  page: async ({ cursor }: { cursor?: string }) => {
    const data = await api("GET", "deployments", { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Deployment })),
      next: data.next ? () => DeploymentCollection.page({ cursor: data.next }) : null,
    };
  },
  create: async (args: { name: string; model: string; version: string; hardware: string; min_instances: number; max_instances: number }) => {
    const data = await api("POST", "deployments", undefined, args);
    return { ...data, ...Deployment };
  },
};

export const Deployment = {
  gref: (_, { obj }) => root.deployments.one({ owner: obj.owner, name: obj.name }),
  delete: async (_, { self }) => {
    const { owner, name } = self.$argsAt(root.deployments.one);
    return api("DELETE", `deployments/${owner}/${name}`);
  },
  update: async (args: { hardware?: string; min_instances?: number; max_instances?: number; version?: string }, { self }) => {
    const { owner, name } = self.$argsAt(root.deployments.one);
    const data = await api("PATCH", `deployments/${owner}/${name}`, undefined, args);
    return { ...data, ...Deployment };
  },
  predict: async (args: { input: any; stream?: boolean; webhook?: string; webhook_events_filter?: string[] }, { self }) => {
    const { owner, name } = self.$argsAt(root.deployments.one);
    const data = await api("POST", `deployments/${owner}/${name}/predictions`, undefined, args);
    return { ...data, ...Prediction };
  },
};

export const HardwareCollection = {
  list: async () => {
    const data = await api("GET", "hardware");
    return data.map((item: any) => ({ ...item, ...Hardware }));
  },
};

export const Hardware = {
  gref: (_, { obj }) => root.hardware.list().find((h: any) => h.sku === obj.sku),
};

export const ModelCollection = {
  three: async ({ owner, name }: { owner: string; name: string }) => {
    const data = await api("GET", `models/${owner}/${name}`);
    return { ...data, ...Model };
  },
  two: async ({ cursor }: { cursor?: string }) => {
    const data = await api("GET", "models", { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Model })),
      next: data.next ? () => ModelCollection.page({ cursor: data.next }) : null,
    };
  },
  create: async (args: { owner: string; name: string; visibility: string; hardware: string; description?: string; github_url?: string; paper_url?: string; license_url?: string; cover_image_url?: string }) => {
    const data = await api("POST", "models", undefined, args);
    return { ...data, ...Model };
  },
  search: async ({ query, cursor }: { query: string; cursor?: string }) => {
    const data = await api("GET", "models", { query, cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Model })),
      next: data.next ? () => ModelCollection.search({ query, cursor: data.next }) : null,
    };
  },
};

export const Model = {
  gref: (_, { obj }) => root.models.one({ owner: obj.owner, name: obj.name }),
  delete: async (_, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    return api("DELETE", `models/${owner}/${name}`);
  },
  predict: async (args: { version: string; input: any; stream?: boolean; webhook?: string; webhook_events_filter?: string[] }, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    const data = await api("POST", `models/${owner}/${name}/predictions`, undefined, args);
    return { ...data, ...Prediction };
  },
  versions: () => ModelVersionCollection,
};

export const ModelVersionCollection = {
  one: async ({ id }: { id: string }, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    const data = await api("GET", `models/${owner}/${name}/versions/${id}`);
    return { ...data, ...ModelVersion };
  },
  page: async ({ cursor }: { cursor?: string }, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    const data = await api("GET", `models/${owner}/${name}/versions`, { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...ModelVersion })),
      next: data.next ? () => ModelVersionCollection.page({ cursor: data.next }) : null,
    };
  },
};

export const ModelVersion = {
  gref: (_, { obj, self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    return root.models.one({ owner, name }).versions.one({ id: obj.id });
  },
  delete: async (_, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    const { id } = self.$argsAt(root.models.one.versions.one);
    return api("DELETE", `models/${owner}/${name}/versions/${id}`);
  },
  train: async (args: { destination: string; input: any; webhook?: string; webhook_events_filter?: string[] }, { self }) => {
    const { owner, name } = self.$argsAt(root.models.one);
    const { id } = self.$argsAt(root.models.one.versions.one);
    const data = await api("POST", `models/${owner}/${name}/versions/${id}/trainings`, undefined, args);
    return { ...data, ...Training };
  },
};

export const PredictionCollection = {
  three: async ({ id }: { id: string }) => {
    const data = await api("GET", `predictions/${id}`);
    return { ...data, ...Prediction };
  },
  four: async ({ cursor }: { cursor?: string }) => {
    const data = await api("GET", "predictions", { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Prediction })),
      next: data.next ? () => PredictionCollection.page({ cursor: data.next }) : null,
    };
  },
  create: async (args: { version: string; input: any; stream?: boolean; webhook?: string; webhook_events_filter?: string[] }) => {
    const data = await api("POST", "predictions", undefined, args);
    return { ...data, ...Prediction };
  },
};

export const Prediction = {
  gref: (_, { obj }) => root.predictions.one({ id: obj.id }),
  cancel: async (_, { self }) => {
    const { id } = self.$argsAt(root.predictions.one);
    return api("POST", `predictions/${id}/cancel`);
  },
};

export const TrainingCollection = {
  one: async ({ id }: { id: string }) => {
    const data = await api("GET", `trainings/${id}`);
    return { ...data, ...Training };
  },
  page: async ({ cursor }: { cursor?: string }) => {
    const data = await api("GET", "trainings", { cursor });
    return {
      items: data.results.map((item: any) => ({ ...item, ...Training })),
      next: data.next ? () => TrainingCollection.page({ cursor: data.next }) : null,
    };
  },
};

export const Training = {
  gref: (_, { obj }) => root.trainings.one({ id: obj.id }),
  cancel: async (_, { self }) => {
    const { id } = self.$argsAt(root.trainings.one);
    return api("POST", `trainings/${id}/cancel`);
  },
};

async function api(method: Method, path: string, query?: Record<string, any>, body?: any) {
  const url = new URL(`${baseUrl}/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    "Authorization": `Token ${state.API_TOKEN}`,
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

export const Tests = {
  testConfiguration: async () => {
    const result = await root.configure({ apiToken: "test_token" });
    return result === "Configuration completed successfully.";
  },
  testAccount: async () => {
    const account = await root.account();
    return account.username !== undefined;
  },
  testCollections: async () => {
    const page = await root.collections.page({});
    return Array.isArray(page.items) && page.items.length > 0;
  },
  testDeployments: async () => {
    const page = await root.deployments.page({});
    return Array.isArray(page.items) && page.items.length > 0;
  },
  testHardware: async () => {
    const hardwareList = await root.hardware.list();
    return Array.isArray(hardwareList) && hardwareList.length > 0;
  },
  testModels: async () => {
    const page = await root.models.page({});
    return Array.isArray(page.items) && page.items.length > 0;
  },
  testPredictions: async () => {
    const page = await root.predictions.page({});
    return Array.isArray(page.items) && page.items.length > 0;
  },
  testTrainings: async () => {
    const page = await root.trainings.page({});
    return Array.isArray(page.items) && page.items.length > 0;
  },
};

export async function endpoint({ path, body }) {
  if (path === "/webhook") {
    const event = JSON.parse(body);
    await dispatchEvent(event.id, event.type);
  }
}

async function dispatchEvent(id: string, eventType: string) {
  const prediction = root.predictions.one({ id });
  await prediction.changed.$emit({ type: eventType });
}