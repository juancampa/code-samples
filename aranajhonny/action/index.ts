// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state } from "membrane";

export async function run() {
  console.log(`Hello World`);
}

// Handles the program's HTTP endpoint
export async function endpoint(args) {
  return `Path: ${args.path}`;
}
