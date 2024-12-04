import { BaseAgent } from "./BaseAgent.ts";
import { apiAnalyzerInstructions } from "./agentInstructions.ts";

export class ApiAnalyzerAgent extends BaseAgent {
  async execute(apiSpec: string): Promise<string> {
    const instructions = apiAnalyzerInstructions;
    // const context = await this.getContext("API analysis techniques and best practices", "api_analysis");
    
    const fullContext = `
      API Specification:
      ${apiSpec}
    `;

    return this.llm.generate(instructions, fullContext);
  };
}
