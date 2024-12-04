import { root, nodes } from "membrane";
const { sys_sms } = nodes;

export const Root = {
  configure: async (args) => {
    if (!args.number || !args.number.length) {
      throw new Error("Missing phone number");
    }
    const number = args.number.length === 10 ? `+1${args.number}` : args.number;
    if (number[0] !== "+") {
      throw new Error("Phone number must start with +");
    }
    return await sys_sms.configure({ number }).$invoke();
  },

  handleSms: async ({ message }) => {
    await root.received.$emit({ message });
  },

  send: async (args, { self }) => {
    const message = args.message;
    await sys_sms.send({ message }).$invoke();
  },
};
