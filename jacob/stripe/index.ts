// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { root, nodes, state } from "membrane";
import { api } from "./helpers";

// api({ method: "POST", path: "/refunds", body: { payment_intent, amount } })

async function ensureWebhook(event) {
  try {
    const webhooks = await root.listWebhooks();
    const targetWebhook = webhooks.find(
      (webhook) => webhook.url === state.endpointUrl
    );

    if (targetWebhook) {
      if (targetWebhook.enabled_events.includes("charge.succeeded")) {
        console.log("Webhook already exists", event);
      } else {
        const updatedEvents = [...targetWebhook.enabled_events, event];
        const webhookEndpoint = api({
          method: "POST",
          path: `/webhook_endpoints/${targetWebhook.id}`,
          body: { enabled_events: updatedEvents },
        });
        console.log("Webhook updated with new event.", webhookEndpoint);
      }
    } else {
      // Create a new webhook
      const webhookEndpoint = await api({
        method: "POST",
        path: `/webhook_endpoints`,
        body: { enabled_events: [event], url: state.endpointUrl },
      });

      console.log("New webhook created.");
    }
  } catch (error) {
    throw new Error(`Error registering ${event}. Details: ${error}`);
  }
}

async function removeWebhook(event) {
  const webhooks = await root.listWebhooks();
  console.log(webhooks);
  const targetWebhooks = webhooks.filter(
    (webhook) =>
      webhook.url === state.endpointUrl &&
      webhook.enabled_events.includes(event)
  );
  targetWebhooks.map((targetWebhook) =>
    api({ method: "DELETE", path: `/webhook_endpoints/${targetWebhook.id}` })
  );
}

export const Root = {
  async configure({ secretKey }) {
    state.secretKey = secretKey;
    root.statusChanged.$emit();
    if (!state.endpointUrl) {
      state.endpointUrl = (await nodes.process.endpointUrl) + "/webhooks";
    }
  },
  status() {
    if (!state.secretKey) return "[Add secret key](:configure)";

    const isTestKey = state.secretKey?.startsWith("sk_test");
    const isLiveKey = state.secretKey?.startsWith("sk_live");
    if (isTestKey) return `Ready (TEST mode)`;
    if (isLiveKey) return `Ready (LIVE mode)`;

    return "[Unexpected secret key format](:configure)";
  },

  chargeMade: {
    async subscribe(_, { self }) {
      console.log("subscription happening");
      await ensureWebhook("charge.succeeded");
    },
    async unsubscribe(_, { self }) {
      await removeWebhook("charge.succeeded");
    },
  },
  products: () => ({}),
  async listWebhooks() {
    let allWebhooks = [];

    let response = await api({
      method: "GET",
      path: "/webhook_endpoints",
      body: { limit: 10 },
    });
    let startingAfter =
      response.data.length > 0
        ? response.data[response.data.length - 1].id
        : undefined;

    allWebhooks = allWebhooks.concat(response.data);

    while (response.has_more) {
      response = await api({
        method: "GET",
        path: "/webhook_endpoints",
        body: { limit: 10, starting_after: startingAfter },
      });
      startingAfter =
        response.data.length > 0
          ? response.data[response.data.length - 1].id
          : undefined;
      allWebhooks = allWebhooks.concat(response.data);
    }
    return allWebhooks;
  },
};

export const ProductCollection = {
  async one(args) {
    const response = await api({
      method: "GET",
      path: `/products/${args.id}`,
    });
    return response;
  },
};

// Handles the program's HTTP endpoint
export async function endpoint({ path, query, headers, method, body }) {
  switch (path) {
    case "/webhooks":
      const event = JSON.parse(body);
      if (event.type === "charge.succeeded") {
        root.chargeMade.$emit(event);
      }
    default:
      console.log("Unknown Endpoint:", path);
  }
}
