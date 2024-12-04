/**
 * Driver for the Hacker News API.
 */
import { root, nodes, state } from "membrane";

// Sometimes we have to find the correct userId by hitting the site. We keep the actual user IDs here so we don't have
// to hit the site for the same user more than once
state.actualUserIds = state.actualUserIds || {};

async function getApi(path: string) {
  const url = `https://hacker-news.firebaseio.com/v0/${path}`;
  const json = await nodes.http.get({ url, headers: "{}" }).$query(`{ body }`);
  return JSON.parse(json.body!);
}

async function siteGet(path: string) {
  const url = `https://news.ycombinator.com/${path}`;
  const html = await nodes.http.get({ url, headers: "{}" }).$query(`{ body }`);
  return html.body!;
}

async function getAlgolia(path: string) {
  const url = `https://hn.algolia.com/api/v1/${path}`;
  const json = await nodes.http.get({ url, headers: "{}" }).$query(`{ body }`);
  return JSON.parse(json.body!);
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

export const Root = {
  items() {
    return {};
  },
  users() {
    return {};
  },
  stories() {
    return {};
  },
  status() {
    return "Ready";
  },
  parse({ name, value }) {
    switch (name) {
      case "item": {
        const id = value.match(/id=([0-9]+)$/)?.[1];
        if (id) {
          return [root.items.one({ id: parseInt(id) })];
        }
        break;
      }
      case "user": {
        const id = value.match(/id=([a-zA-Z0-9_-]+)$/)?.[1];
        if (id) {
          return [root.users.one({ id })];
        }
        break;
      }
    }
    return [];
  },
  tests() {
    return {};
  },
};

export const Tests = {
  testGetStories: async () => {
    const stories = await root.stories.page.items.$query(`{ id }`);
    return Array.isArray(stories);
  },
  testGetItems: async () => {
    const items = await root.items.page.items.$query(`{ id }`);
    return Array.isArray(items);
  },
};

export const Item = {
  async parent(_, { obj }) {
    if (obj.parent) {
      return getApi(`/item/${obj.parent}.json`);
    }
  },
  async gref(_, { self, obj }) {
    if (obj && typeof obj.id === "number") {
      return root.items.one({ id: obj.id });
    }
    return self;
  },
  async kids(_, { obj }) {
    return (
      obj.kids &&
      Promise.all(obj.kids.slice(0, 5).map((id) => getApi(`/item/${id}.json`)))
    );
  },
};

export const UserCollection = {
  async one(args, { context }) {
    let actualId = state.actualUserIds[args.id];
    const json = await getApi(`/user/${actualId || args.id}.json`);
    if (json === null && actualId === undefined) {
      const html = await siteGet(`user?id=${args.id}`);
      const matches = html.match(new RegExp(`Profile: (${args.id})`, "i"));
      console.log("Trying with actual username", matches?.[1]);
      actualId = matches?.[1];
      state.actualUserIds[args.id] = actualId || null; // We set it to null to avoid trying again
      if (actualId) {
        return await getApi(`/user/${actualId}.json`);
      }
    }
    context.userId = json?.id;
    return json;
  },
};

export const User = {
  async submitted(args, { obj, self }) {
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(1, Math.min(25, args.pageSize ?? 15));
    const startIndex = (page - 1) * pageSize;

    const ids = obj.submitted.slice(startIndex, startIndex + pageSize);
    return { items: ids, next: self.submitted({ page: page + 1 }) };
  },
};

export const UserItemPage = {
  async items(_, { obj, info }) {
    if (!shouldFetch(info, ["id"])) {
      // No need to fetch if query is only asking for item IDs
      return obj.items.map((id) => ({ id }));
    }
    const promises = obj.items.map((id) => getApi(`item/${id}.json`));
    const items = await Promise.all(promises);
    return items;
  },
};

export const ItemCollection = {
  async one(args) {
    return getApi(`/item/${args.id}.json`);
  },

  page: async (args, { self }) => {
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(1, Math.min(25, args.pageSize ?? 15));
    let promises: Promise<any>[] = [];
    if (args.topic) {
      const startIndex = (page - 1) * pageSize;
      const posts = await getApi(`/${args.topic}stories.json`);

      promises = posts.slice(startIndex, startIndex + pageSize).map((id) => {
        return getApi(`/item/${id}.json`);
      });
    } else {
      const maxItem = await getApi("maxitem.json");
      const start = maxItem - (page - 1) * pageSize;

      for (let i = 0; i < pageSize; i++) {
        promises.push(getApi(`/item/${start - i}.json`));
      }
    }
    const items = await Promise.all(promises);
    return { items, next: self.page({ page: page + 1 }) };
    // const { author } = context;
    // const res = await getAlgolia(`search_by_date?tags=author_${author}`);
    // const items = res.hits;
    // return { items }
  },
};

export const UserItemCollection = {
  async one(args) {
    return getApi(`/item/${args.id}.json`);
  },
};

// TODO: Use algolia API
// export const UserItemCollection = {
//   async one({ args }) {
//     return getApi(`/item/${args.id}.json`);
//   },

//   page: async ({ self, args }) => {
//     // const { author } = context;
//     // const res = await getAlgolia(`search_by_date?tags=author_${author}`);
//     // const items = res.hits;
//     // return { items }
//   },
// };
