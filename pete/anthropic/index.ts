// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { state } from "membrane";

export function status() {
  if (!state.apiKey) {
    return "Please [get an Anthropic API key](https://console.anthropic.com/account/keys) and [configure](:configure) it.";
  } else {
    return `Ready`;
  }
}

export async function configure({ apiKey, defaults }) {
  state.apiKey = apiKey ?? state.apiKey;
  state.defaults = defaults ?? state.defaults;
}

async function api(method: string, path: string, body?: any) {
  const response = await fetch(`https://api.anthropic.com${path}`, {
    method,
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": state.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
}

export async function complete(args) {
  let { prompt, stop_sequences } = args;
  const model = args.model ?? "claude-2";
  const max_tokens_to_sample = args.max_tokens_to_sample ?? 4000;
  if (stop_sequences && !Array.isArray(stop_sequences)) {
    throw new Error("stop_sequences must be an array");
  }

  // Add the required prefix/suffix if missing
  if (!prompt.startsWith("\n\nHuman:")) {
    prompt = "\n\nHuman:" + prompt;
  }
  if (!prompt.endsWith("\nAssistant:")) {
    prompt = prompt + "\nAssistant:";
  }

  const body = await api("POST", "/v1/complete", {
    ...args,
    max_tokens_to_sample,
    prompt,
    model,
    stop_sequences,
  });

  return body.completion;
}

// claude-3-haiku-20240307
// [{"role": "user", "content": "Hello, Claude"}]
// 1024
export async function messages(args) {
  const { model, messages, max_tokens, system, tools } = args;

  return api("POST", "/v1/messages", args);
}