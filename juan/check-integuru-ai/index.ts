import { root, nodes } from "membrane";

export async function configure() {
  // You can also set up a cron in the Navigator (sidebar)
  root.poll.$cron("0 0 12 * * *"); // Every day at 12:00 UTC
}

state.seen ??= [];

export async function poll() {
  const res = await fetch("https://integuru.ai");
  const text = await res.text();
  const re = /"https:\/\/github.com\/[^"]*"/g;
  const integrations = [...text.matchAll(re)].map(([match, ...rest]) => match );
  const added = difference(integrations, state.seen);
  if (added.length) {
    await nodes.email.send({ subject: "New Integration in integuru.ai", body: added.join('\n') });
    state.seen = added;
  }
}

const difference = (a: string[], b: string[]): string[] => a.filter((e: string) => !b.includes(e));