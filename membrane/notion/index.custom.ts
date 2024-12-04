import { root, state } from "membrane";

export async function api(
  method: string,
  path: string,
  query?: any,
  body?: string
) {
  if (!state.token) {
    throw new Error(
      "You must first invoke the configure action with an API token"
    );
  }
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";
  const url = `https://api.notion.com/${path}${querystr}`;
  const req = {
    method,
    body,
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
  };
  return await fetch(url, req);
}

export function getItemsFromResponse(
  json: any,
  path: string,
  args: any,
  self: Gref<any>
): any[] {
  // const last = path.split("/").pop();
  // return json[last!];
  return [];
}

export function getNextPageRef(
  json: any,
  path: string,
  args: any,
  self: any
): any {
  return null;
}

export function getSelfGref(obj: any, typeName, self): Gref<any> | undefined {
  switch (typeName) {
    case "Block":
      return root.blocks.one({ id: obj.id }) as any;
    case "Database":
      return root.databases.one({ id: obj.id }) as any;
    case "Page":
      return root.pages.one({ id: obj.id }) as any;
    case "User":
      return root.users.one({ id: obj.id }) as any;
  }
}
