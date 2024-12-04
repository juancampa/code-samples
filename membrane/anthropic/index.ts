import { state } from "membrane";

export const Root = {
  status() {
    if (!state.apiKey) {
      return "Please [get an Anthropic API key](https://console.anthropic.com/account/keys) and [configure](:configure) it.";
    } else {
      return `Ready`;
    }
  },
  
  configure({ apiKey }) {
    state.apiKey = apiKey ?? state.apiKey;
  },
  
  tests: () => ({})
};

async function api(method: string, path: string, body?: any) {
  const headers = {
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "x-api-key": state.apiKey,
    "anthropic-beta": "prompt-caching-2024-07-31"
  };

  const response = await fetch(`https://api.anthropic.com${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
}

export async function complete(args: {
  model: string;
  messages: Array<{ role: string; content: string | Array<{ type: string; [key: string]: any }> }>;
  max_tokens: number;
  metadata?: {
    user_id?: string;
  };
  stop_sequences?: string[];
  stream?: boolean;
  system?: Array<{ type: string; text: string; cache_control?: { type: string }; }>;
  temperature?: number;
  tool_choice?: {
    type: 'auto' | 'any' | 'tool';
    tool?: {
      name: string;
    };
  };
  tools?: Array<{
    name: string;
    description?: string;
    input_schema: {
      type: string;
      properties: {
        [key: string]: {
          type: string;
          description?: string;
          items?: {
            type: string;
          };
        };
      };
      required?: string[];
    };
  }>;
  top_k?: number;
  top_p?: number;
}) {
  const {
    model,
    messages,
    max_tokens = 7500,
    metadata,
    stop_sequences,
    stream,
    system,
    temperature,
    tool_choice,
    tools,
    top_k,
    top_p
  } = args;

  const body: any = {
    model,
    messages,
    max_tokens
  };

  if (metadata) body.metadata = metadata;
  if (stop_sequences) body.stop_sequences = stop_sequences;
  if (stream !== undefined) body.stream = stream;
  if (system) body.system = system;
  if (temperature !== undefined) body.temperature = temperature;
  if (tool_choice) body.tool_choice = tool_choice;
  if (tools) body.tools = tools;
  if (top_k !== undefined) body.top_k = top_k;
  if (top_p !== undefined) body.top_p = top_p;

  const response = await api("POST", "/v1/messages", body);
  
  if (Array.isArray(response.content) && response.content.length > 0) {
    const firstContent = response.content[0];
    if (firstContent.type === 'text') {
      return firstContent.text;
    } else {
      console.warn('Unexpected content type:', firstContent.type);
      return JSON.stringify(firstContent);
    }
  } else {
    throw new Error('Unexpected response structure');
  }
}

export const TestCollection = {
  async completeWithAllArgs() {
    try {
      // First turn: Ask Claude to analyze and use tools
      let result = await complete({
        model: "claude-3-opus-20240229",
        messages: [
          { role: "user", content: "Please analyze this sentence: 'The quick brown fox jumps over the lazy dog.' Use the provided tools to give a word count and parts of speech analysis." }
        ],
        max_tokens: 300,
        metadata: {
          user_id: "test_user_123"
        },
        stop_sequences: ["END"],
        stream: false,
        system: [
          {
            type: "text",
            text: "You are a helpful AI assistant specializing in language analysis. Use the provided tools when appropriate.",
            cache_control: { type: "ephemeral" }
          }
        ],
        temperature: 0.7,
        tool_choice: {
          type: "auto"
        },
        tools: [
          {
            name: "word_count",
            description: "Count the number of words in a given text",
            input_schema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The text to count words in"
                }
              },
              required: ["text"]
            }
          },
          {
            name: "part_of_speech_tagger",
            description: "Tag parts of speech in a given text",
            input_schema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The text to analyze"
                }
              },
              required: ["text"]
            }
          }
        ],
        top_k: 40,
        top_p: 0.95
      });

      console.log("First turn response:", result);

      // Simulate tool execution
      const wordCount = 9; // "The quick brown fox jumps over the lazy dog." has 9 words
      const posTagging = "The/DET quick/ADJ brown/ADJ fox/NOUN jumps/VERB over/ADP the/DET lazy/ADJ dog/NOUN ./PUNCT";

      // Second turn: Provide tool results and ask for final analysis
      result = await complete({
        model: "claude-3-opus-20240229",
        messages: [
          { role: "user", content: "Please analyze this sentence: 'The quick brown fox jumps over the lazy dog.' Use the provided tools to give a word count and parts of speech analysis." },
          { role: "assistant", content: result },
          { role: "user", content: `Here are the tool results:\nword_count: ${wordCount}\npart_of_speech_tagger: ${posTagging}\n\nNow, please provide a final analysis of the sentence using these results.` }
        ],
        max_tokens: 300,
        metadata: {
          user_id: "test_user_123"
        },
        temperature: 0.7
      });

      console.log(`Test with all args completed. Final Response: ${result}`);
    } catch (error) {
      console.error(`Test with all args failed. Error: ${error.message}`);
    }
  },

  async simpleComplete() {
    try {
      const result = await complete({
        model: "claude-3-opus-20240229",
        messages: [
          { role: "user", content: "What's the capital of France?" }
        ],
        max_tokens: 50
      });

      console.log(`Simple test completed. Response: ${result}`);
    } catch (error) {
      console.error(`Simple test failed. Error: ${error.message}`);
    }
  }
};