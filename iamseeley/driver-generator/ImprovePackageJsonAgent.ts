import { BaseAgent } from "./BaseAgent";
import { improvePackageJsonInstructions } from "./agentInstructions";

export class ImprovePackageJsonAgent extends BaseAgent {
  async execute(input: { packageJson: string, feedback: string, name: string }): Promise<string> {
    const instructions = improvePackageJsonInstructions(input.name);
    // const context = await this.getContext("membrane driver package.json configuration", "configuration");
    
    const fullContext = `
      Original package.json:
      ${input.packageJson}
      
      Feedback:
      ${input.feedback}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}