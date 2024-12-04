import nacl from "tweetnacl";
import rbjs from "random-bytes-js";
import { state, nodes } from "membrane";
import { OAuth2Client } from "@badgateway/oauth2-client";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export async function api(
  method: Method,
  path: string,
  query?: any,
  body?: string,
  authType: "botToken" | "oauth" = "botToken"
) {
  if (!state.token && !state.accessToken) {
    throw new Error(
      "You must be authenticated to use this API. Visit the program's endpoint"
    );
  }
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "DiscordBot (https://github.com/membrane-io/membrane-driver-discord, 1.0.0)",
  };

  if (authType === "botToken" && state.token) {
    headers["Authorization"] = `Bot ${state.token}`;
  } else if (authType === "oauth" && state.accessToken) {
    headers["Authorization"] = `Bearer ${state.accessToken.accessToken}`;
  } else {
    throw new Error(`Authentication not properly configured for ${authType}`);
  }

  try {
    const res = await fetch(`https://discord.com/api/${path}${querystr}`, {
      method,
      body,
      headers,
    });
    if (res.status >= 400 && res.status < 600) {
      throw new Error(`The HTTP status of the response: ${res.status}, Body: ${await res.text()}`);
    }
    return res;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

export function usingUserApiKey() {
  return state.clientId && state.clientSecret;
}

export async function authStatus() {
  let status: string[] = [];
  if (state.token) {
    status.push("Bot Token: Configured");
  }
  if (state.clientId && state.clientSecret) {
    status.push("OAuth: Configured");
    if (state.accessToken) {
      status.push("OAuth: Authenticated");
    } else {
      status.push(`OAuth: Not authenticated. [Sign In](${await nodes.process.endpointUrl.$get()}/auth).`);
    }
  }
  if (status.length === 0) {
    return "Refer to setup instructions in the README to [configure](:configure).";
  }
  return status.join("\n");
}

export async function createAuthClient() {
  const { clientId, clientSecret } = state;
  if (clientId && clientSecret) {
    state.oauth2Client = new OAuth2Client({
      clientId,
      clientSecret,
      server: "https://discord.com",
      tokenEndpoint: "https://discord.com/api/oauth2/token",
      authorizationEndpoint: "https://discord.com/oauth2/authorize",
    });
  }
}

export function verifyHeaders(body, headers) {
  nacl.setPRNG(function (x, n) {
    var i,
      v = rbjs(n);
    for (i = 0; i < n; i++) x[i] = v[i];
    for (i = 0; i < v.length; i++) v[i] = 0;
  });
  const reqHeaders = JSON.parse(headers);
  const signature = reqHeaders["x-signature-ed25519"];
  const timestamp = reqHeaders["x-signature-timestamp"];
  const PUBLIC_KEY = state.publicKey;
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(PUBLIC_KEY, "hex")
  );
}

export function html(body: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Discord Driver for Membrane</title>
        <link rel="stylesheet" href="https://www.membrane.io/light.css">
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          ${body}
        </div>
      </body>
    </html>
  `;
}

export function indexHtml(baseUrl: string, authPath: string) {
  let statusMessages: string[] = [];
  let actions: string[] = [];

  // Check Bot Token
  if (state.token) {
    statusMessages.push("Bot Token: Configured and Authenticated");
  } else {
    statusMessages.push("Bot Token: Not Configured");
  }

  // Check OAuth
  if (state.clientId && state.clientSecret) {
    statusMessages.push("OAuth: Configured");
    if (state.accessToken) {
      statusMessages.push("OAuth: Authenticated");
    } else {
      statusMessages.push("OAuth: Not Authenticated");
    }
    actions.push(`<a href="${baseUrl}/${authPath}" class="button">Add Bot to Another Server</a>`);
  } else {
    statusMessages.push("OAuth: Not Configured");
  }

  // If neither Bot Token nor OAuth is configured
  if (!state.token && (!state.clientId || !state.clientSecret)) {
    actions.push(`<p>Please configure the Discord driver using the <code>:configure</code> action.</p>`);
  }

  return `
    <h1>Discord Driver for Membrane</h1>
    <h2>Status:</h2>
    <div>
      ${statusMessages.map(msg => `<p>${msg}</p>`).join('')}
    </div>
    <h2>Actions:</h2>
    <div>
      ${actions.join('')}
    </div>
    <p>For more information on how to use this driver, please refer to the <a href="https://github.com/membrane-io/membrane-driver-discord">documentation</a>.</p>
  `;
}
