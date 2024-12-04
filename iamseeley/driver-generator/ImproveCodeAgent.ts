import { BaseAgent } from "./BaseAgent";
import { improveCodeInstructions } from "./agentInstructions";

export class ImproveCodeAgent extends BaseAgent {
  async execute(input: { code: string, feedback: string, analyzedApi: string }): Promise<string> {
    const instructions = improveCodeInstructions;
    // const context = await this.getContext("membrane driver code structure and best practices", "code_generation");
    
    const fullContext = `
      Original Code:
      ${input.code}
    
      Feedback:
      ${input.feedback}

      API Summary:
      ${input.analyzedApi}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}