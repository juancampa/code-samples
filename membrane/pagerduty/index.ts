import { root, state } from "membrane";

export const Root = {
  incidents: () => ({}),
  status: () => {
    if (!state.apiKey) {
      return "Please [get an PagerDuty API key](https://support.pagerduty.com/docs/generating-api-keys) and [configure](:configure) it.";
    } else {
      return `Ready`;
    }
  },
  configure: ({ apiKey }) => {
    state.apiKey = apiKey ?? state.apiKey;
    root.statusChanged.$emit();
  },
  sendEvent: async (args: any) => {
    return await api("POST", "v2/enqueue", args, null, null, "events");
  },
};

export const IncidentCollection = {
  one: async (args, { info }) => {
    if (!shouldFetch(info, ["id"])) {
      return { id: args.id };
    }
    const res = await api("GET", `incidents/${args.id}`);
    return res.incident;
  },
  page: async (args, { self }) => {
    const res = await api("GET", "incidents", null, args);

    return {
      items: res.incidents,
      next: self.page({ ...args, limit: res.limit, offset: res.offset + 1 }),
    };
  },
};

export const Incident = {
  gref: (_, { obj }) => {
    return root.incidents.one({ id: obj!.id });
  },
  alerts: () => ({}),
  resolved: async ({ email }, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    const data = {
      incidents: [
        {
          id: incident,
          type: "incident_reference",
          status: "resolved",
        },
      ],
    };
    return await api("PUT", "incidents", data, null, { From: email });
  },
  acknowledged: ({ email }, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    const data = {
      incidents: [
        {
          id: incident,
          type: "incident_reference",
          status: "acknowledged",
        },
      ],
    };
    return api("PUT", "incidents", data, null, { From: email });
  },
};

export const AlertCollection = {
  one: async (args, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);

    const res = await api(
      "GET",
      `incidents/${incident}/alerts/${args.alert_id}`
    );

    return res.alert;
  },
  page: async (args, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    const res = await api("GET", `incidents/${incident}/alerts`, null, args);

    return {
      items: res.alerts,
      next: self.page({ ...args, limit: res.limit, offset: res.offset + 1 }),
    };
  },
};

export const Alert = {
  gref: (_, { obj, self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    return root.incidents
      .one({ id: incident })
      .alerts.one({ alert_id: obj!.id });
  },
  triggered: async ({ email }, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    const { id: alert } = self.$argsAt(root.incidents.one.alerts.one);
    const data = {
      alerts: [
        {
          id: alert,
          type: "alert",
          status: "triggered",
        },
      ],
    };
    return await api("PUT", `incidents/${incident}/alerts`, data, null, {
      From: email,
    });
  },
  resolved: async ({ email }, { self }) => {
    const { id: incident } = self.$argsAt(root.incidents.one);
    const { id: alert } = self.$argsAt(root.incidents.one.alerts.one);
    const data = {
      alerts: [
        {
          id: alert,
          type: "alert",
          status: "resolved",
        },
      ],
    };
    return await api("PUT", `incidents/${incident}/alerts`, data, null, {
      From: email,
    });
  },
};

// This is a helper function to make API calls to PagerDuty
async function api(
  method: string,
  path: string,
  body?: any,
  query?: any,
  headers?: any,
  resource?: string
) {
  resource = resource ?? "api";
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  const response: any = await fetch(
    `https://${resource}.pagerduty.com/${path}${querystr}`,
    {
      method,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: `Token token=${state.apiKey}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
}

// Determines if a query includes any fields that require fetching a given resource. Simple fields is an array of the
// fields that can be resolved without fetching,typically just "id" but it depends on what the API includes in
// denormalized responses (i.e. responses that embed related objects).
const shouldFetch = (info: any, simpleFields: string[]) =>
  info.fieldNodes
    .flatMap(({ selectionSet: { selections } }) => {
      return selections;
    })
    .some(({ name: { value } }) => !simpleFields.includes(value));
