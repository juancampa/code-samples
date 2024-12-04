// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state } from "membrane";

async function api(type, url_end, body) {
  const apiKey = state.api_key;
  const url = "https://api.close.com/api" + url_end;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
  };

  try {
    const response = await fetch(url, {
      method: type,
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function api_get(type, url_end) {
  const apiKey = state.api_key;
  const url = "https://api.close.com/api" + url_end;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
  };

  try {
    const response = await fetch(url, {
      method: type,
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}

// Handles the program's HTTP endpoint
export async function endpoint(args) {
  return `Path: ${args.path}`;
}

export const Root = {
  contacts: () => ({}),
  leads: () => ({}),
  async configure(args) {
    state.api_key = args.api_key;
  },
};

export const ContactCollection = {
  async createContact(args) {
    const url = "/v1/contact/";
    await api("POST", url, JSON.stringify(args));
  },
  async updateContact(args) {
    const url = `/v1/contact/${args.contact_id}`;
    await api("PUT", url, JSON.stringify(args));
  },
  async findContactEmail(args) {
    const body = {
      query: {
        type: "and",
        queries: [
          { type: "object_type", object_type: "contact" },
          {
            type: "has_related",
            this_object_type: "contact",
            related_object_type: "contact_email",
            related_query: {
              type: "field_condition",
              field: {
                object_type: "contact_email",
                type: "regular_field",
                field_name: "email",
              },
              condition: {
                type: "text",
                mode: "full_words",
                value: args.email,
              },
            },
          },
        ],
      },
    };
    const contact = await api("POST", "/v1/data/search/", JSON.stringify(body));
    return contact.data;
  },
  async findContactPhone(args) {
    const body = {
      query: {
        type: "and",
        queries: [
          { type: "object_type", object_type: "contact" },
          {
            type: "has_related",
            this_object_type: "contact",
            related_object_type: "contact_phone",
            related_query: {
              type: "field_condition",
              field: {
                object_type: "contact_phone",
                type: "regular_field",
                field_name: "phone",
              },
              condition: {
                type: "text",
                mode: "full_words",
                value: args.phone,
              },
            },
          },
        ],
      },
    };
    const contact = await api("POST", "/v1/data/search/", JSON.stringify(body));

    return contact.data;
  },
  async one(args) {
    const res = await api_get("GET", `/v1/contact/${args.id}/`);
    return res;
  },
};

export const LeadCollection = {
  async one(args) {
    const res = await api_get("GET", `/v1/lead/${args.id}/`);
    return res;
  },

  async createLead(args) {
    const url = "/v1/lead/";
    const custom_fields = args.custom_fields
      ? Object.fromEntries(args.custom_fields.map((key) => [key, null]))
      : {};
    const { ["custom_fields"]: _, ...lead_except_custom } = args;
    const lead = { ...custom_fields, ...lead_except_custom };
    const created = await api("POST", url, JSON.stringify(lead));
  },
};
