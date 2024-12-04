// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, root, state } from "membrane";

// export async function status() {
//   const hits = state.hits ?? 0;
//   if (hits === 0) {
//     return "←-- Right click to Copy webhook URL";
//   }
//   return `Hits: ${hits} ${hits > 0 ? "" : "- Right click to copy URL"}`;
// }

// export async function configure() {
//   if (!state.endpointUrl) {
//     state.endpointUrl = await nodes.process.endpointUrl;
//   }
//   console.log(
//     "Token configured. Enter webhook URL on Tally to configure webhook."
//   );
// }

export async function configure(signing_secret) {
  state.signing_secret = signing_secret;
}

async function verify_secret(headers) {
  return false;
}

export async function endpoint(req) {
  const { method, path, query, body } = req;
  const headers = JSON.parse(req.headers);
  console.log(headers);
  const auth =
    state.signing_secret === "no_secret" ? await verify_secret(headers) : false;
  if (auth) {
    root.formSubmitted.$emit(
      JSON.stringify({ path, method, headers, body }, null, 2)
    );
  }
  //https://tally.so/help/webhooks
}
