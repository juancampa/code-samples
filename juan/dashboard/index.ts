import { state, root } from "membrane";

interface Item {
  id: number;
  name: string;
  node: any;
  tags: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface State {
  items: { [key: string]: Item };
  nextId: number;
}

// Initialize state
state.items ??= {};
state.nextId ??= 1;

export const Root = {
  put: ({ node, name, x, y, width, height }) => {
    const id = state.nextId++;
    state.items[id] = {
      id,
      name: name ?? 'node',
      node,
      tags: [],
      x: x ?? 10,
      y: y ?? 10,
      width: width ?? 325,
      height: height ?? 250,
    };
    return id;
  },

  remove: ({ id }) => {
    delete state.items[id];
  },

  move: ({ id, x, y, width, height }) => {
    const item = state.items[id];
    item.x = x ?? item.x;
    item.y = y ?? item.y;
    item.width = width ?? item.width;
    item.height = height ?? item.height;
  },

  one: ({ id }) => state.items[id],

  rename: ({ id, name }) => {
    state.items[id].name = name;
  },

  page: ({ tag }) => {
    return {
      items: Object.entries(state.items)
        .filter(([_, item]) => !tag || item.tags.includes(tag))
        .map(([id, item]) => ({
          gref: root.one({ id }),
          ...item,
        })),
      // TODO: paginate
      next: null,
    };
  },
};
