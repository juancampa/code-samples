import { state, nodes } from "membrane";

export async function api(args: {
  method: string;
  path: string;
  body?: any;
}): Promise<any> {
  if (!state.secretKey) throw new Error("Secret key not configured");
  //   const encodedSecretKey = Buffer.from(state.secretKey).toString("base64");

  const { path, body = {}, method } = args;

  console.log("here");
  // const response = await fetch(url.toString(), {
  //   method,
  //   headers: {
  //     Authorization: `Bearer ${state.secretKey}`,
  //   },
  // });
  let response;
  switch (method) {
    case "GET":
      const url_get = new URL(`https://api.stripe.com/v1${path}`);
      Object.entries(body).forEach(([key, value]) => {
        url_get.searchParams.append(key, value as string);
      });
      console.log({
        url: url_get.toString(),
        headers: JSON.stringify({ Authorization: `Bearer ${state.secretKey}` }),
      });
      response = JSON.parse(
        await nodes.http.get({
          url: url_get.toString(),
          headers: JSON.stringify({
            Authorization: `Bearer ${state.secretKey}`,
          }),
        }).body
      );
      break;
    case "POST":
      const url_post = new URL(`https://api.stripe.com/v1${path}`);
      const data = new URLSearchParams();
      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          Array.isArray(body[key])
            ? data.append(key + "[]", body[key])
            : data.append(key, body[key]);
        }
      }

      console.log("post", {
        url: url_post.toString(),
        headers: JSON.stringify({
          Authorization: `Bearer ${state.secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: data,
      });

      response = await nodes.http.post({
        url: url_post.toString(),
        headers: JSON.stringify({
          Authorization: `Bearer ${state.secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: data.toString(),
      });
      response = response.body;
      console.log(response);
      break;
    case "PATCH":
    case "GET":
    case "GET":
    case "GET":
    default:
      break;
  }
  // if (!response.ok) {
  //   throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  // }
  return response;
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
