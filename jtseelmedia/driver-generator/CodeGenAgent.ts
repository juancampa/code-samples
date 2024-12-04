import { BaseAgent } from "./BaseAgent";
import { codeGeneratorInstructions } from "./agentInstructions";

export class CodeGeneratorAgent extends BaseAgent {
  async execute(input: { memconfig: string, analyzedApi: string }): Promise<string> {
    const instructions = codeGeneratorInstructions;
  //  const context = await this.getContext("membrane driver code structure and best practices", "code_generation");
    
    const fullContext = `
      memconfig:
      ${input.memconfig}
      
      Analyzed API:
      ${input.analyzedApi}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}