import { BaseAgent } from "./BaseAgent";

export class PackageJsonGeneratorAgent extends BaseAgent {
  async execute(input: { name: string, code: string }): Promise<string> {
    const instructions = this.getInstructions(input.name);
    // const context = await this.getContext("membrane driver package.json configuration", "configuration");
    
    const fullContext = `
      Code:
      ${input.code}
    `;

    return this.llm.generate(instructions, fullContext);
  }

  protected getInstructions(name: string): string {
    return `
    <package_json_generator_info>
    You are an expert in configuring package.json files for Membrane drivers. Your task is to generate a valid package.json file based on the provided driver code and name.

    Follow these requirements for generating the package.json file:

    <requirements>
      * Output only valid JSON for a package.json file.
      * Include the correct name, version, and license fields.
      * Include only dependencies that are actually used in the generated code.
      * List all necessary dependencies based on the imports in the code.
      * ONLY INCLUDE A DEPENDENCY IF IT IS IMPORTED IN THE CODE.
      * Use the provided name for the package name.
      * Set the initial version to "1.0.0".
      * Use "ISC" as the default license unless specified otherwise.
      * Do not include any devDependencies, scripts, or other fields unless explicitly required.
      * Ensure the JSON is properly formatted and valid.
    </requirements>

    Use the following template as a reference for the structure of the package.json:

    <template>
    {
      "name": "${name}",
      "version": "1.0.0",
      "license": "ISC",
      "dependencies": {
        // List dependencies here (only if there is a corresponding import in the code file)
      }
    }
    </template>

    Ensure that the generated package.json accurately represents the dependencies of the Membrane driver and follows best practices for Node.js package configuration.

    DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
    DO NOT WRAP RETURNED JSON IN A CODE BLOCK.
    Begin the JSON content with the opening curly brace and ensure it's properly formatted.
    </package_json_generator_info>
    `;
  }
}