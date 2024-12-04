import { state, nodes, root } from "membrane";

state.tools = ["slack", "github"];
state.history ??= [];

export interface State {
  token?: string; // membrane token
  tools?: string[]; // membrane programs that duck has access to
  history?: string[]; // todo: structure history
  paused?: boolean; // true when waiting to receive a text
  resolvers?: Array<(value: unknown) => void>; // resolve fns from spawned Promises in root.wait
}

export async function fetchTools() {
  const path = "/ps"
  const params = new URLSearchParams();
  params.append("include_schemas", "true");
  params.append("include_expressions", "true");

  // Note: https returns no SSL certificate error
  const response = await fetch(`http://api.membrane.io${path}?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    }
  });

  const { programs: workspacePrograms } = await response.json();
  const programs = workspacePrograms.filter(p => state.tools?.includes(p.name));
  console.log(JSON.stringify(programs));
}

export async function configure({ token }) {
  state.token = token;
  await nodes.sms.received.$subscribe(root.readSms);
}

// this is the entry point to an agent working on an objective
// eventually, this could be called by sending an email, sms, slack DM, HTTP endpoint etc.
export async function run({ objective, llm, sms }) {
  const start = Date.now();
  const stamp = () => `${((Date.now() - start) / 1000).toFixed(2)}s`
  console.log(`[${stamp()}] Starting duck`);

  if (sms) {
    objective = `Send a text in response to the following objective. ${objective}`;
  }

  const agent = llm === "claude" ? claude : gpt;
  await agent({ objective, stamp });

  console.log(`[${stamp()}] Finished looping`);
}

export async function readSms(_, { event }) {
  if (event.message.startsWith("Hey duck,")) {
    // TODO: add an optional param indicating sms entry point so that duck texts back when the loop is complete
    await root.run({ objective: event.message, sms: true });
    return;
  }
  
  state.history?.push(event.message);
  state.paused = false;
}

export async function getInformationFromUser({ message }) {
  await nodes.sms.send({ message });
  state.paused = true;
  return await root.wait();
}

// TODO: can I avoid polling here and instead just await a single Promise?
export async function wait() {
  return new Promise(resolve => {
    state.resolvers.push(resolve);
    if (state.paused) {
      console.log("waiting for text...")
      root.wait().$invokeIn(5);
    } else {
      try {
        state.resolvers?.slice(0, -1).forEach(resolve => resolve());
        state.resolvers = [];
        resolve(state.history[state.history?.length - 1]);
      } catch (error) {
        console.error(error);
      }
    }
  })
}

interface AgentArgs {
  objective: string;
  stamp: () => string;
}

async function claude({ objective, stamp }: AgentArgs) {
  const MODEL = "claude-3-haiku-20240307";
  const MAX_TOKENS = 1024;
  const messages = [
    {"role": "user", "content": objective },
  ];

  async function sendMessages() {
    console.log(`[${stamp()}] Sending instructions to ${MODEL}`)
    return nodes.anthropic.messages({
      model: MODEL,
      system: SYSTEM_PROMPT,
      max_tokens: MAX_TOKENS,
      tools: ANTHROPIC_TOOLS,
      messages,
    });
  } 

  let msgResponse = await sendMessages();
  if (msgResponse.stop_reason === "tool_use") await loop();

  async function loop() {
    messages.push({
      role: msgResponse.role,
      content: msgResponse.content
    });

    const tool = msgResponse.content.find(c => c.type === "tool_use");
    console.log(`[${stamp()}] Attempting to call ${tool.name} tool with args: ${JSON.stringify(tool.input)}`);
    const toolResponse = await toolFns[tool.name](tool.input);
    
    messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: tool.id,
        content: toolResponse ?? `invoked ${tool.name}`,
        // TODO: we can handle tool call errors with is_error
      }]
    });

    msgResponse = await sendMessages();
    if (msgResponse.stop_reason === "tool_use") await loop();
  }

  console.log(`[${stamp()}] ${msgResponse.content[0].text}`);
}

async function gpt({ objective, stamp }: AgentArgs) {
  const MODEL = "gpt-4o-mini";
  const TEMPERATURE = 0.5;
  const messages = [
    {"role": "system", "content": SYSTEM_PROMPT },
    {"role": "user", "content": objective },
  ];

  async function completeChat() {
    console.log(`[${stamp()}] Sending instructions to ${MODEL}`)
    return nodes.openai.models
      .one({ id: MODEL })
      .completeChat({
        messages,
        temperature: TEMPERATURE,
        tools: OPENAI_TOOLS,
      })
  }

  let chatResponse = await completeChat();
  if (chatResponse.tool_calls?.length) await loop();

  async function loop() {
    messages.push(chatResponse);

    for (const toolCall of chatResponse.tool_calls) {
      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[${stamp()}] Attempting to call ${fnName} tool with args: ${JSON.stringify(args)}`);
      const fnResponse = await toolFns[fnName](args);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: fnName,
        content: fnResponse ?? `invoked ${fnName}`,
      });
    }

    chatResponse = await completeChat();
    if (chatResponse.tool_calls?.length) await loop();
  }

  console.log(`[${stamp()}] ${chatResponse.content}`);
}

const SYSTEM_PROMPT = `
  You are an agent acting on behalf of a user within their Membrane workspace.
  The user is a software engineer.
  Membrane is a collection of internal tools that the user has configured in their Membrane workspace.

  You have access to this set of tools to complete your objective given by the user.
  If you need any clarification, you must use the "getInformationFromUser" tool to ask the user for more information.
  Use the "message" argument to the "getInformationFromUser" tool to ask your clarification question.
  Do not simply respond with your clarification—the program only works if you structure your clarification by using "getInformationFromUser".
  The "getInformationFromUser" tool will be used to pause execution until the user has responded.
  
  Do not make assumptions for what arguments to pass to tools. You should ask the user for more information if needed.
  Never respond with fake data. Data must always be real data that you received as output from a tool.
  If it seems like no available tool is suitable to complete the task, say so. 
  If a tool is not working as intended and you are unable to access real data, say so. 
  You can provide a reason and error messages from the tool, if any. 
  
  The user will send you an objective now.
`;

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, any>; // TODO: review and use JSON schema types in ./jsonSchema.types.ts
  required: string[];
}

const ANTHROPIC_TOOLS: AnthropicTool[] = [
  {  
    name: "sleep",
    description: "Wait for a number of seconds before continuing. Only one sleep can be invoked at a time.",
    input_schema: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "The number of seconds to sleep before continuing execution"
        }
      },
      required: ["seconds"]
    }
  },
  {
    name: "sms",
    description: "Send a text message to the user",
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The content of the text message"
        }
      },
      required: ["message"]
    }
  },
  {
    name: "email",
    description: "Send an email to the user",
    input_schema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "The subject of the email"
        },
        body: {
          type: "string",
          description: "The body of the email"
        },
      },
      required: ["subject", "body"]
    }
  }
]

interface OpenAiTool {
  type: "function"; // as of 6/25/24, openai only supports function tools
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>; // TODO: review and use JSON schema types in ./jsonSchema.types.ts
  }
}

const OPENAI_TOOLS: OpenAiTool[] = [
  {
    type: "function",
    function: {
      name: "getInformationFromUser",
      description: "When more information is needed from the user, ask the user via sms then wait for a text response before continuing.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string"
          }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "sleep",
      description: "Wait for a number of seconds before continuing. Only one sleep can be invoked at a time.",
      parameters: {
        type: "object",
        properties: {
          seconds: {
            type: "number"
          }
        },
        required: ["seconds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "sms",
      description: "Send a text message to the user",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string"
          }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "email",
      description: "Send an email to the user",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string"
          },
          body: {
            type: "string"
          },
        },
        required: ["subject", "body"]
      }
    }
  },
]

// this should be typed in a way that connects `TOOLS` with `toolFns`
const toolFns = {
  waitForText: root.waitForText,
  sleep: async ({ seconds }: { seconds: number }) => sleep(seconds),
  sms: async ({ message }: { message: string }) => nodes.sms.send({ message }),
  email: async ({ subject, body }: { subject: string; body: string }) => nodes.email.send({ subject, body }),
};

// careful exposing public ways to run this agent because it costs money
export async function endpoint(args) {/* TODO: invoke run */}
export const email = async ({ from, subject, text }) => {/* TODO: invoke run */}
