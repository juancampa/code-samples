import { BaseAgent } from "./BaseAgent";
import { improveDocsInstructions } from "./agentInstructions";

export class ImproveDocsAgent extends BaseAgent {
  async execute(input: { docs: string, code: string, feedback: string, name: string }): Promise<string> {
    const instructions = improveDocsInstructions(input.name);
   // const context = await this.getContext("membrane driver documentation best practices", "documentation");
    
    const fullContext = `
      Original README:
      ${input.docs}
      
      Feedback:
      ${input.feedback}
      
      Driver Code:
      ${input.code}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}