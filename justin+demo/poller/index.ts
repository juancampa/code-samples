// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { root, nodes, state } from "membrane";

// INSTRUCTIONS:
//  1. Change the URL to be polled below
//  2. Find this action in the graph and select "Invoke At Schedule" to run it as a cronjob
export async function poll() {
  const res = await fetch("https://news.ycombinator.com");

  const status = res.status;
  const text = await res.text();

  console.log("Status:", status);
}
