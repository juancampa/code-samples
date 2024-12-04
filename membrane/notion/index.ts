import { Root } from "./index.gen";
import { root } from "membrane";

export * from "./index.gen";

(Root as any).parse = ({ name, value }) => {
  switch (name) {
    case "block": {
      const id = value.match(/data-block-id="([0-9a-z-]+)"/)?.[1];
      if (id) {
        return [root.blocks.one({ id })];
      }
      break;
    }
  }
  return [];
};
