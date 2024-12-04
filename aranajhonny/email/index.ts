import { nodes } from "membrane";
const { sys_email } = nodes;

export const Root = {
  send: async (args) => {
    await sys_email.send({ ...args }).$invoke();
  },
};
