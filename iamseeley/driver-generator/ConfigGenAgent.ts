import { BaseAgent } from "./BaseAgent";
import { configGeneratorInstructions } from "./agentInstructions";
  
// Context:
// ${context}

export class ConfigGeneratorAgent extends BaseAgent {
  async execute(input: { analyzedApi: string }): Promise<string> {
    const instructions = configGeneratorInstructions;
    // const context = await this.getContext("membrane driver schema design", "schema_design");
    
    const fullContext = `
      Analyzed API:
      ${input.analyzedApi}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}