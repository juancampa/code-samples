/**
* LLM Service for Driver Generation
* Handles communication with language models (Anthropic/OpenAI) for generating and analyzing 
* code/content. Supports retries, instruction formatting, and different completion methods. 
* Primary interface for all LLM operations in the driver generator.
*/

import { nodes } from "membrane";
import { sanitizeInput } from "./util";


export class LLM {
  provider: 'anthropic' | 'openai';
  private model: string;
  private maxRetries: number;

  private generalSystemMessage: string = `
You are an AI assistant specialized in generating various types of content including code, configuration files, and documentation for Membrane drivers.
Follow the instructions in each prompt precisely and provide only the requested output.
Do not include any explanatory text or additional commentary unless specifically requested.
Adapt your output format based on the instructions given in each prompt.
`;

  constructor(provider: 'anthropic' | 'openai' = 'anthropic', model: string = "claude-3-5-sonnet-20240620", maxRetries: number = 3) {
    this.provider = provider;
    this.model = model;
    this.maxRetries = maxRetries;
  }

  async complete(prompt: string, cacheableContent: { text: string; type: "system" | "user" }[] = []): Promise<string> {
    if (this.provider !== 'anthropic') {
      throw new Error("The complete method is only available for Anthropic models");
    }
  
    const safePrompt = sanitizeInput(prompt);
    
    return this.retry(async () => {
      // Combine all system messages into a single system message
      const combinedSystemMessage = [
        this.generalSystemMessage,
        ...cacheableContent
          .filter(content => content.type === "system")
          .map(content => content.text)
      ].join("\n\n");

      // Transform user messages into the correct format
      const userMessages = cacheableContent
        .filter(content => content.type === "user")
        .map(content => ({
          role: "user",
          content: sanitizeInput(content.text)
        }));

      // Construct the final messages array
      const messages = [
        ...userMessages,
        {
          role: "user",
          content: safePrompt
        }
      ];

      const response = await nodes.anthropic.complete({
        model: this.model,
        max_tokens: 8000,
        system: combinedSystemMessage,
        messages: messages.map(msg => ({
          role: msg.role,
          content: [{
            type: "text",
            text: msg.content
          }]
        }))
      });
  
      if (typeof response === 'string') {
        return response.trim();
      }
  
      throw new Error(`Unexpected response type from Anthropic: ${typeof response}`);
    });
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        console.error(`Error on attempt ${attempt + 1}:`, error);
        if (attempt === this.maxRetries - 1) {
          throw error;
        }
        const delay = Math.pow(2, attempt) * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries reached");
  }
  
  async completeChat(messages: Array<{ role: string, content: string }>): Promise<string> {
    if (this.provider !== 'openai') {
      throw new Error("The completeChat method is only available for OpenAI models");
    }
  
    return this.retry(async () => {
      const response = await nodes.openai.models.one({ id: this.model }).completeChat({
        messages: messages.map(msg => ({
          ...msg,
          content: sanitizeInput(msg.content)
        })),
      });
      if (typeof response === 'object' && response !== null && 'content' in response) {
        return (response.content as string).trim();
      } else {
        console.error("Unexpected response format from OpenAI:", response);
        throw new Error("Unexpected response format from OpenAI");
      }
    });
  }

  async analyze(text: string, instruction: string, cacheableContent: { text: string; type: "system" | "user" }[] = []): Promise<string> {
    const userMessage = `
  Text to analyze:
  ${text}
  
  Analysis instructions:
  ${instruction}
  
  Please provide a detailed analysis based on the above instructions. Focus on the key aspects mentioned and structure your response accordingly.
    `;
  
    if (this.provider === 'anthropic') {
      return this.complete(userMessage, [
        ...cacheableContent,
        { text: instruction, type: "system" }
      ]);
    } else {
      return this.completeChat([
        { role: "system", content: this.generalSystemMessage + "\n\n" + instruction },
        ...cacheableContent.map(content => ({ role: content.type, content: content.text })),
        { role: "user", content: userMessage },
        { role: "assistant", content: "Here's the analysis:" }
      ]);
    }
  }

  async generate(instruction: string, context: string = "", cacheableContent: { text: string; type: "system" | "user" }[] = []): Promise<string> {
    const userMessage = `
    Instruction:
    ${instruction}

    Context:
    ${context}
    `;
    
    if (this.provider === 'anthropic') {
      return this.complete(userMessage, [...cacheableContent, { text: instruction, type: "system" }]);
    } else {
      return this.completeChat([
        { role: "system", content: this.generalSystemMessage + "\n\n" + instruction },
        { role: "user", content: userMessage },
        { role: "assistant", content: "Here's the generated content:" }
      ]);
    }
  }
}