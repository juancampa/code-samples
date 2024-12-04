import { state as _state, root } from "membrane";

interface Item {
  node: any;
  tags: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}
interface State {
  items: { [key: string]: Item };
}

// Make state typed
const state = _state as State;

// Initialize state
state.items = state.items ?? {};

export const Root = {
  put: ({ node, name, x, y, width, height }) => {
    let key: string = name;
    let i = name ? 2 : 1;
    while (!key || state.items[key] !== undefined) {
      key = `${name ?? "node"}${i++}`;
    }
    state.items[key] = {
      node,
      tags: [],
      x: x ?? 10,
      y: y ?? 10,
      width: width ?? 320,
      height: height ?? 240,
    };
    return key;
  },
  remove: ({ name }) => {
    delete state.items[name];
  },
  removeMatching: ({ regex }) => {
    const re = new RegExp(regex);
    for (const name of Object.keys(state.items)) {
      if (re.test(name)) {
        delete state.items[name];
      }
    }
  },
  move: ({ name, x, y, width, height }) => {
    const item = state.items[name];
    item.x = x ?? item.x;
    item.y = y ?? item.y;
    item.width = width ?? item.width;
    item.height = height ?? item.height;
  },
  one: ({ name }) => state.items[name],
  rename: ({ newName, oldName }) => {
    if (newName !== oldName) {
      state.items[newName] = state.items[oldName];
      delete state.items[oldName];
    }
  },
  page: ({ tag }) => {
    return {
      items: Object.entries(state.items)
        .filter((entry) => !tag || entry[1].tags.includes(tag))
        .map(([name, item]) => ({
          gref: root.one({ name }),
          name,
          ...item,
        })),
      // TODO: paginate
      next: null,
    };
  },
};
