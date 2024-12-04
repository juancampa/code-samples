/**
 * `nodes` contain any nodes you add from the graph (connections).
 * `root` is a reference to this program's root node.
 * `state` is an object is durable across program updates.
 */
import { nodes, root, state } from "membrane";

export interface State {
  [username: string]: {
    id: string;
    lastSeen: number;
  };
}

/**
 * Sets up a "cron" timer that invokes `check` every hour.
 * Note: you can also set up crons in the Navigator—this `configure` action isn't strictly necessary.
 * Press "Invoke ►" above the fn signature to invoke the `configure` action.
 */
export function configure() {
  root.check.$cron("0 0 1 * * *");
}

/**
 * TODO:
 * Invoke this action manually to start following a user:
 * 1. Select `follow-hn-user` in the Navigator (left sidebar)
 * 2. Click `follow`, type in a `username` arg, then click "Invoke".
 */
export async function follow({ username }) {
  const { id, submitted } = await nodes.hn.users
    .one({ id: username })
    .$query(`{ id submitted { items { id } } }`);
  const lastSeen = submitted?.items?.[0]?.id ?? 0;
  state[username] = { id, lastSeen };
}

export async function check() {
  for (const [username, { lastSeen }] of Object.entries(state)) {
    const items = await nodes.hn.users
      .one({ id: username })
      .submitted.items.$query(`{ id }`);

    const latest = (items ?? [])[0]; // The first item returned by the API is the most recent one
    if (latest?.id > lastSeen) {
      const url = `https://news.ycombinator.com/item?id=${latest.id}`;
      // Note: you could use `sms`, `slack`, or `discord` as a connection instead of `email`.
      await nodes.email.send({
        subject: `New HN post from ${username}`,
        body: url,
      });
      state[username] = latest.id;
    }
  }
}
