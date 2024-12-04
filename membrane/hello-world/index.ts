import { state, nodes } from "membrane";

// Click `Invoke ►` above the `run` fn signature, then see Logs (bottom) and check your email
export async function run() {
  console.log("Hello World");

  // `nodes` is how you connect to your other programs
  await nodes.email.send({ subject: "Welcome to Membrane", body: "👋" });
}

// Click `Open Preview` (above fn signature), then check Logs and state (bottom left)
export async function endpoint({ method, path, body, headers, query }) {
  // `state` is like a little db for your program
  if (!state.hits) state.hits = 0;
  state.hits++;

  return `Visitors: ${state.hits}`;
}
