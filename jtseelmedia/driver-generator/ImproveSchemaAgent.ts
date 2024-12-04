import { BaseAgent } from "./BaseAgent";
import { improveSchemaInstructions } from "./agentInstructions";

export class ImproveSchemaAgent extends BaseAgent {
  async execute(input: { schema: string, feedback: string }): Promise<string> {
    const instructions = improveSchemaInstructions;
    // const context = await this.getContext("membrane driver schema design", "schema_design");
    
    const fullContext = `
      Original memconfig.json:
      ${input.schema}
      
      Feedback:
      ${input.feedback}
    `;

    return this.llm.generate(instructions, fullContext);
  }
}