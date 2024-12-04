import { state, root } from "membrane";

// Auth0 Management API
export interface State {
  CLIENT_ID?: string;
  CLIENT_SECRET?: string;
  DOMAIN?: string;
}

// Auth0 Application must be M2M and have the following scopes:
// - read:users
// - update:users
export const Root = {
  status() {
    const missing: string[] = [];
    if (!state.DOMAIN) missing.push("Domain");
    if (!state.CLIENT_ID) missing.push("Client ID");
    if (!state.CLIENT_SECRET) missing.push("Client Secret"); 
    
    
    if (missing.length === 3) {
      return "Not configured";
    }
    
    if (missing.length > 0) {
      return `Not configured: Missing ${missing.join(", ")}`;
    }
  
    return "Configured";
  },

  configure: async ({ domain, client_id, client_secret}) => {
    state.DOMAIN = domain;
    state.CLIENT_ID = client_id;
    state.CLIENT_SECRET = client_secret;
    return "Auth0 API configured successfully";
  },

  users: () => ({})
};

export const User = {
  gref: (_, { obj }) => root.users.one({ id: obj.user_id }),
  
  verify: async ({}, { self }) => {
    const userId = self.$argsAt(root.users.one).id;
    await api("PATCH", `/users/${userId}`, undefined, {
      email_verified: true
    });
    return "User verified successfully";
  }
};

export const UserCollection = {
  one: async ({ id }) => {
    return await api("GET", `/users/${id}`);
  },

  page: async ({ 
    per_page,
    page, 
    query,
    include_totals = true,
    sort,
    connection,
    fields,
    include_fields,
    search_engine = 'v3'
  }) => {
    const result = await api("GET", "/users", {
      page,
      per_page: per_page || 50,
      include_totals,
      ...(sort && { sort }),
      ...(connection && { connection }),
      ...(fields && { fields }),
      ...(include_fields !== undefined && { include_fields }),
      ...(query && { q: query }),
      search_engine
    });

    return {
      items: result.users,
      next: result.users?.length === (per_page || 50) ? page + 1 : null
    };
  },

  verifyAll: async () => {
    let pageNumber = 0;
    const perPage = 50;
    let totalUpdated = 0;

    while (true) {
      const result = await api("GET", "/users", {
        page: pageNumber,
        per_page: perPage,
        include_totals: true,
        search_engine: 'v3',
        q: 'email_verified:false'
      });

      if (!result.users || result.users.length === 0) {
        break;
      }

      console.log(`Processing page ${pageNumber + 1}, total unverified users: ${result.total}`);

      for (const user of result.users) {
        await api("PATCH", `/users/${user.user_id}`, undefined, {
          email_verified: true
        });
        totalUpdated++;
        console.log(`Updated user: ${user.email}`);
      }

      if (result.users.length < perPage) {
        break;
      }

      pageNumber++;
    }

    return `Completed. Total users verified: ${totalUpdated}`;
  }
};

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function getManagementToken() {
  const tokenResponse = await fetch(`https://${state.DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: state.CLIENT_ID,
      client_secret: state.CLIENT_SECRET,
      audience: `https://${state.DOMAIN}/api/v2/`,
      grant_type: 'client_credentials'
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get management token: ${await tokenResponse.text()}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

async function api(method: Method, path: string, query?: Record<string, any>, body?: any) {
  if (!state.CLIENT_ID || !state.CLIENT_SECRET || !state.DOMAIN) {
    throw new Error("You must configure the client credentials and domain first");
  }

  const token = await getManagementToken();
  
  let queryString = '';
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      // Skip undefined/null values
      if (value === undefined || value === null) continue;
      
      // Numbers need to be converted to string but will be sent as numbers in the request
      if (typeof value === 'number') {
        params.append(key, value.toString());
      } else if (typeof value === 'boolean') {
        params.append(key, value.toString());
      } else {
        params.append(key, String(value));
      }
    }
    queryString = `?${params.toString()}`;
  }

  const url = `https://${state.DOMAIN}/api/v2${path}${queryString}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!res.ok) {
    throw new Error(`Auth0 API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}