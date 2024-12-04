import { nodes, root, state } from "membrane";

async function api(
  method: "GET" | "POST",
  path: string,
  query?: any,
  body?: any
) {
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  //******************* TODO: use https ***************//
  const url = `http://api.membrane.io/${path}${querystr}`;

  const req = {
    method,
    body,
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
  };
  const res = await fetch(url, req);
  if (res.status !== 200) {
    throw new Error(`Membrane API returned ${res.status}: ${res.text()}`);
  }
  return res;
}

export const Root = {
  status() {
    if (!state.token) {
      return `Not ready`;
    } else {
      return `Ready`;
    }
  },
  configure: async ({ token }) => {
    state.token = token;
  },
  programs: () => ({}),
  action: async ({ gref }) => {
    const res = await api("POST", "action", null, JSON.stringify({ gref }));
    return await res.json();
  },
  query: async ({ ref, query }) => {
    const res = await api(
      "POST",
      "query",
      null,
      JSON.stringify({ gref: ref, query })
    );
    return await res.json();
  },
  tests() {
    return {};
  },
};

export const Tests = {
  testGetPrograms: async () => {
    const res = await api("GET", `ps`);
    const data = await res.json();

    return Array.isArray(data.programs);
  },
};

export const ProgramCollection = {
  one: async ({ pid }) => {
    const res = await api(
      "GET",
      `ps?include_schemas=true&include_expressions=true`
    );
    const data = await res.json();
    // Find the program with the specified pid
    const program = data.programs.find((p: any) => p.pid === pid);

    // Check if the program is found
    if (program) {
      program.schema = program.schema;
      program.expressions = program.expressions;
    }
    return program;
  },
  page: async ({ include_schemas, include_expressions }) => {
    const res = await api("GET", `ps`, {
      include_schemas,
      include_expressions,
    });
    const data = await res.json();
    return { items: data.programs, next: null };
  },
};

export const Program = {
  gref: (_, { obj }) => {
    return root.programs.one({ pid: obj.pid });
  },
  schema: (_, { obj }) => {
    return obj.schema;
  },
  kill: async (_, { self }) => {
    const { pid } = self.$argsAt(root.programs.one);

    const res = await api("POST", "kill", null, JSON.stringify({ pid }));
    return await res.json();
  },
};