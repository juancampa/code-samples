import { state } from "membrane";

const api_url = "https://api.twitter.com";

export async function api(
  method: RequestMethod,
  path: string,
  query?: any,
  body?: string
): Promise<any> {
  if (!state.clientId || !state.clientSecret) {
    throw new Error(
      "You must first invoke the configure action with an API key and secret."
    );
  }
  if (!state.accessToken) {
    throw new Error(
      "Please open the endpoint URL and follow the steps to obtain the access token."
    );
  }

  // refresh tokens if expired
  if (Date.now() > state.expires.getTime()) {
    console.log("Refreshing access token...");
    const { access_token, refresh_token } = await getBearerToken("refresh");
    state.accessToken = access_token;
    state.refreshToken = refresh_token;
  }

  // setup querystring
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";
  const url = `${api_url}/${path}${querystr}`;

  const req = {
    method,
    body,
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
      "content-type": "application/json",
    },
  };
  return await fetch(url, req);
}

export type ResolverInfo = {
  fieldNodes: {
    selectionSet: {
      selections: any;
    };
  }[];
};

export async function getBearerToken(type: string, code?: string) {
  const url = new URL(`${api_url}/2/oauth2/token`);
  const params = new URLSearchParams(url.search);

  params.append("client_id", state.clientId);
  if (type === "refresh") {
    params.append("refresh_token", state.refreshToken);
    params.append("grant_type", "refresh_token");
  } else if (type === "access") {
    params.append("code", code!);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", `${state.endpointUrl}/callback`);
    params.append("code_verifier", state.codeChallenge);
  }

  const req = {
    method: "POST" as RequestMethod,
    body: params.toString(),
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${state.clientId}:${state.clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const res = await fetch(`${api_url}/2/oauth2/token`, req);

  const { expires_in, refresh_token, access_token } = await res.json();
  expiredIn(Number(expires_in));

  return { access_token, refresh_token };
}

// Parse Query String
export const parseQS = (qs: string): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(qs).entries());

// taked from js-client-oauth2/blob/master/src/client-oauth2.js#L319
function expiredIn(duration) {
  if (typeof duration === "number") {
    state.expires = new Date();
    state.expires.setSeconds(state.expires.getSeconds() + duration);
  } else if (duration instanceof Date) {
    state.expires = new Date(duration.getTime());
  } else {
    throw new TypeError("Unknown duration: " + duration);
  }
  return state.expires;
}

// Determines if a query includes any fields that require fetching a given resource. Simple fields is an array of the
// fields that can be resolved without fetching
export const shouldFetch = (info: ResolverInfo, simpleFields: string[]) =>
  info.fieldNodes
    .flatMap(({ selectionSet: { selections } }) => {
      return selections;
    })
    .some(({ name: { value } }) => !simpleFields.includes(value));
