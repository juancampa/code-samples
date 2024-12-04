import { state, nodes, root } from "membrane";

state.messages ??= [];

/**
 * This action subscribes to the `sms.received` event.
 * Invoke it to set up the subscription.
 */
export async function listenSms() {
    await nodes.sms.received.$subscribe(root.readSms);
}

/**
 * This action is the handler for `sms.received` events.
 * When you text Membrane, you'll see the `received` event in Logs.
 */
export async function readSms(_, { event }) {
  const received = event.message;
  state.messages.push(received);
  // TODO: do something cool!
}

/**
 * This action wraps `sms.send`.
 * It's not strictly necessary, but it makes it testing easier.
 */
export async function sendSms({ msg }) {
  await nodes.sms.send({ message: msg });
}
