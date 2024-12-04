// Determines if a query includes any fields that require fetching a given resource. Simple fields is an array of the
// fields that can be resolved without fetching
type ResolverInfo = {
  fieldNodes: {
    selectionSet: {
      selections: any;
    };
  }[];
};

export function shouldFetch(info: ResolverInfo, simpleFields: string[]) {
  return info.fieldNodes
    .flatMap(({ selectionSet: { selections } }) => {
      return selections;
    })
    .some(({ name: { value } }) => !simpleFields.includes(value));
}

export function shouldFetchItems(
  info: ResolverInfo,
  simpleFields: string[]
): boolean {
  const selection = info.fieldNodes
    .flatMap(({ selectionSet: { selections } }) => {
      return selections;
    })
    .find(({ name: { value } }) => value === "items");
  if (selection) {
    return selection.selectionSet.selections.some(
      ({ name: { value } }) => !simpleFields.includes(value)
    );
  } else {
    return false;
  }
}

// Generic helper to extract the "next" gref from the headers of a response
// TODO: support `prev` and `last` links
export function getPageRefs(
  gref: any,
  response: { headers: any }
): { next?: any } {
  const links = parseLinks(response.headers.link);
  if (!links) {
    return {};
  }
  const refs: { next?: any } = {};
  const args = gref.$args();

  // Github's API uses different methods to paginate depending on the endpoint
  if (links.next?.since !== undefined) {
    refs.next = gref({ ...args, since: links.next.since });
  } else if (links.next?.page !== undefined) {
    const page = Number.parseInt(links.next.page, 10);
    refs.next = gref({ ...args, page });
  } else if (links.next?.url) {
    // Extract the page number from the URL
    const url = new URL(links.next.url);
    if (url.searchParams.get("page")) {
      const page = Number.parseInt(url.searchParams.get("page")!, 10);
      refs.next = gref({ ...args, page });
    }
    if (url.searchParams.get("since")) {
      refs.next = gref({ ...args, since: url.searchParams.get("since") });
    }
  }
  return refs;
}

export function getSearchPageRefs(
  gref: any,
  response: { headers: any }
): { next?: any } {
  const links = parseLinks(response.headers.link);
  if (!links) {
    return {};
  }
  const refs: { next?: any } = {};
  const args = gref.$args();
  if (links) {
    if (links.next?.url !== undefined) {
      const qs = new URL(links.next.url).searchParams;
      const page =
        qs.get("page") !== undefined
          ? parseInt(qs.get("page")!, 10)
          : undefined;
      refs.next = gref({ ...args, q: qs.get("q"), page });
    }
  }
  return refs;
}

// Helper function to convert Membrane collection pattern naming to Github
// pagination naming. Removing any undefined
export function toGithubArgs(args: Record<string, any>): any {
  const result = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      if (key === "pageSize") {
        result["per_page"] = args[key];
      } else {
        result[key] = args[key];
      }
    }
  }
  return result;
}

function parseLinks(linkHeader: string) {
  if (!linkHeader) return null;

  return linkHeader
    .split(/,\s*</)
    .map(parseLink)
    .filter(hasRel)
    .reduce(intoRels, {});
}

function hasRel(x: { rel: any }) {
  return x && x.rel;
}

function intoRels(acc, x) {
  function splitRel(rel) {
    acc[rel] = Object.assign(x, { rel });
  }

  x.rel.split(/\s+/).forEach(splitRel);

  return acc;
}

function parseLink(link: string) {
  try {
    const m = link.match(/<?([^>]*)>(.*)/);
    if (!m) {
      return null;
    }
    const linkUrl = m?.[1];
    const parts = m[2].split(";");
    const parsedUrl = new URL(linkUrl);
    const query = new URLSearchParams(parsedUrl.searchParams);

    parts.shift();

    const info = Object.assign(query, parts.reduce(createObjects, {}));
    info.url = linkUrl;
    return info;
  } catch (e) {
    return null;
  }
}

function createObjects(acc, p) {
  // rel="next" => 1: rel 2: next
  var m = p.match(/\s*(.+)\s*=\s*"?([^"]+)"?/);
  if (m) acc[m[1]] = m[2];
  return acc;
}
