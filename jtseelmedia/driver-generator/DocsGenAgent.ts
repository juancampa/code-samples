import { BaseAgent } from "./BaseAgent";
import { docsGeneratorInstructions } from "./agentInstructions";

export class DocsGeneratorAgent extends BaseAgent {
  async execute(input: { memconfig: string, code: string, name: string }): Promise<string> {
    const instructions = docsGeneratorInstructions(input.name);
   // const context = await this.getContext("membrane driver documentation best practices", "documentation");
    
    const fullContext = `
      memconfig.json:
      ${input.memconfig}
      
      Code:
      ${input.code}
    `;

    return this.llm.generate(instructions, fullContext);
  } 
}