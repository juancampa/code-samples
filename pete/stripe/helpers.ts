import { state } from "membrane";

export async function api(args: {
  method: string;
  path: string;
  body?: any;
}): Promise<any> {
  if (!state.secretKey) throw new Error("Secret key not configured");
  const encodedSecretKey = Buffer.from(state.secretKey).toString("base64");

  const { path, body = {}, method } = args;
  const response: any = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${encodedSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(flattenBody(body)).toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return JSON.parse(response._body);
}

// Transforms JSON into a flat object for urlencoded req
function flattenBody(obj: any, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? `${prefix}[${key}]` : key;
    if (typeof obj[key] === "object") {
      Object.assign(acc, flattenBody(obj[key], pre));
    } else {
      acc[pre] = obj[key];
    }
    return acc;
  }, {});
}

/**
 * https://docs.stripe.com/api/pagination
 */
export async function paginate(basePath, args, self) {
  const { pageSize, startingAfter, endingBefore } = args;

  const params = new URLSearchParams();
  if (pageSize) params.append("limit", Math.min(100, pageSize).toString());
  if (startingAfter) params.append("starting_after", startingAfter);
  if (endingBefore) params.append("ending_before", endingBefore);

  const path = `${basePath}?${params.toString()}`;
  const response = await api({ method: "GET", path });

  let nextArgs;
  if (response.data.length) {
    nextArgs = {
      pageSize,
      startingAfter: response.data[response.data.length - 1].id,
    };
  }

  return {
    items: response.data,
    next: response.has_more ? self.page(nextArgs) : null,
  };
}
