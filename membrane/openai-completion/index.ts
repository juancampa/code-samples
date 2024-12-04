import { nodes } from "membrane";

const AI = nodes.models.one({ id: "gpt-3.5-turbo" });

type Res = { content: string; }

export async function summarize({ text }): Promise<string> {
  const prompt = {
    content: `Condense the text in it's original language into a short summary. \nText:${text}\n`,
    role: "user",
  };
  const res = await AI.completeChat({ messages: [prompt] }) as Res;
  return `Summary: ${res.content}`;
}

export async function grammar({ text }): Promise<string> {
  const prompt = {
    content: `Explain the grammar of the text. \nText:${text}\n`,
    role: "user",
  };
  const res = await AI.completeChat({ messages: [prompt] }) as Res;
  return `Grammar: ${res.content}`;
}

export async function explain({ text }): Promise<string> {
  const prompt = {
    content: `Explain the text. \nText:${text}\n`,
    role: "user",
  };
  const res = await AI.completeChat({ messages: [prompt] }) as Res;
  return `Explanation: ${res.content}`;
}

export async function sentimentAnalysis({ text }): Promise<string> {
  const prompt = {
    content: `Analyze the sentiment of the text. determine if it is: positive, negative or neutral. Returns a single word.\nText:${text}\n`,
    role: "user",
  };
  const res = await AI.completeChat({ messages: [prompt] }) as Res;
  return `Sentiment: ${res.content}`;
}
