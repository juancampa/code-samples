import { LLM } from "./llm";
import { RAG } from "./rag";


export class Agents {
  private llm: LLM;
  private rag: RAG;

  constructor(llm: LLM, rag: RAG) {
    this.llm = llm;
    this.rag = rag;
  }


  // Method to generate a complete Membrane driver (Agent Pipeline)
  async generateDriver(apiSpec: string, name: string): Promise<{
    'index.ts': string;
    'memconfig.json': string;
    'README.md': string;
    'package.json': string;
    isValid: boolean;
    analyzedApi: string;
  }> {
    console.log(`Starting driver generation for ${name}`);

    // Step 1: Analyze API
    const analyzedApi = await this.apiAnalyzer.analyze(apiSpec);

    // Step 2: Generate memconfig.json
    const schemaContext = await this.rag.getRelevantContext("membrane driver schema design", "schema_design");
    const memconfig = await this.configGenerator.generate(analyzedApi, schemaContext);

    // Step 3: Generate code based on memconfig.json
    const codeContext = await this.rag.getRelevantContext("membrane driver code structure and best practices", "code_generation");
    const code = await this.codeGenerator.generate(memconfig, analyzedApi, codeContext);

    // Step 4: Generate README
    const readmeContext = await this.rag.getRelevantContext("membrane driver documentation best practices", "documentation");
    const readme = await this.docsWriter.writeDocs(memconfig, code, name, readmeContext);

    // Step 5: Generate package.json
    const packageJson = await this.packageJsonGenerator.generate(name, code, codeContext);

    // Step 6: Validate the driver
    const validationContext = `${schemaContext}\n\n${codeContext}`;
    const isValid = await this.driverValidator.validate(
      code,
      memconfig,
      packageJson,
      validationContext
    );

    return {
      'index.ts': code,
      'memconfig.json': memconfig,
      'README.md': readme,
      'package.json': packageJson,
      isValid,
      analyzedApi
    };
  }


  // Agents

  // Improve existing driver based on feedback.
  // improveDriver acts as an agent manager, deciding which agent to call based on user feedback.
  async improveDriver(
    driverFiles: {
      'index.ts': string;
      'memconfig.json': string;
      'README.md': string;
      'package.json': string;
    },
    analyzedApi: string,
    feedback: string
  ): Promise<{
    'index.ts': string;
    'memconfig.json': string;
    'README.md': string;
    'package.json': string;
    isValid: boolean;
  }> {
    // Determine which aspect of the driver to improve
    const improvementDecision = await this.decideImprovement(feedback);

    // Improve the selected aspect
    let improvedFiles = { ...driverFiles };
    switch (improvementDecision) {
      case 'code':
        improvedFiles['index.ts'] = await this.improveCode(driverFiles['index.ts'], feedback, analyzedApi);
        break;
      case 'schema':
        improvedFiles['memconfig.json'] = await this.improveSchema(driverFiles['memconfig.json'], feedback);
        break;
      case 'documentation':
        improvedFiles['README.md'] = await this.improveDocs(driverFiles['README.md'], driverFiles['index.ts'], feedback);
        break;
      case 'package':
        improvedFiles['package.json'] = await this.improvePackageJson(driverFiles['package.json'], feedback);
        break;
      case 'all':
        improvedFiles['index.ts'] = await this.improveCode(driverFiles['index.ts'], feedback, analyzedApi);
        improvedFiles['memconfig.json'] = await this.improveSchema(driverFiles['memconfig.json'], feedback);
        improvedFiles['README.md'] = await this.improveDocs(driverFiles['README.md'], driverFiles['index.ts'], feedback);
        improvedFiles['package.json'] = await this.improvePackageJson(driverFiles['package.json'], feedback);
        break;
      default:
        throw new Error('Invalid improvement decision');
    }

    // Validate the improved driver
    const isValid = await this.driverValidator.validate(
      improvedFiles['index.ts'],
      JSON.parse(improvedFiles['memconfig.json']).schema,
      improvedFiles['memconfig.json'],
      improvedFiles['package.json']
    );

    return {
      ...improvedFiles,
      isValid
    };
  }

  private async decideImprovement(feedback: string): Promise<'code' | 'schema' | 'documentation' | 'package' | 'all'> {
    const instructions = `
    Based on the given feedback, decide which aspect of the Membrane driver needs improvement. 

    ${feedback}
    
    Choose from: 'code', 'schema', 'documentation', 'package', or 'all'.
    Respond with only one of these options.
    `;

    const decision = await this.llm.complete(instructions, [
      { text: instructions, type: "system" }
    ]);
    return decision.trim().toLowerCase() as 'code' | 'schema' | 'documentation' | 'package' | 'all';
  }


  private apiAnalyzer = {
    analyze: async (apiSpec: string): Promise<string> => {
      const instructions = this.getApiAnalyzerInstructions();
      return this.llm.generate(instructions, apiSpec);
    }
  };


  private configGenerator = {
    generate: async (analyzedApi: string, context: string): Promise<string> => {
      const instructions = this.getConfigGeneratorInstructions();
      const fullContext = `
      Analyzed API:
      ${analyzedApi}

      Context:
      ${context}
      `;
      return this.llm.generate(instructions, fullContext);
    }
  };

  private codeGenerator = {
    generate: async (memconfig: string, analyzedApi: string, context: string): Promise<string> => {
      const instructions = this.getCodeGeneratorInstructions();
      const fullContext = `
      memconfig:
      ${memconfig}
      
      Analyzed API
      ${analyzedApi}
      
      Context
      ${context}
      `;
      return this.llm.generate(instructions, fullContext);
    }
  };


  private docsWriter = {
    writeDocs: async (memconfig: string, code: string, name: string, context: string): Promise<string> => {
      const instructions = this.getDocsWriterInstructions(name);
      const fullContext = `
      memconfig.json:
      ${memconfig}

      Code:
      ${code}

      Context:
      ${context}
      `;
      return this.llm.generate(instructions, fullContext);
    }
  };

  private packageJsonGenerator = {
    generate: async (name: string, code: string, context: string): Promise<string> => {
      const instructions = this.getPackageJsonGeneratorInstructions(name);
      const fullContext = `
      Code:
      ${code}

      Context:
      ${context}
      `;
      return this.llm.generate(instructions, fullContext);
    }
  };

  private driverValidator = {
    validate: async (code: string, memconfig: string, packageJson: string, context: string): Promise<boolean> => {
      const instructions = this.getDriverValidatorInstructions();
      const fullContext = `
      Code:
      ${code}

      memconfig:
      ${memconfig}

      package.json:
      ${packageJson}

      Context:
      ${context}
      `;
  
      try {
        const validationResult = await this.llm.generate(instructions, fullContext);
  
        if (validationResult === undefined || validationResult === null) {
          console.error("Validation result is undefined or null");
          return false;
        }
  
        return validationResult.trim() === "VALID";
      } catch (error) {
        console.error("Error during driver validation:", error);
        return false;
      }
    }
  };

  async improveCode(code: string, feedback: string, analyzedApi: string): Promise<string> {
    console.log(`improveCode: Starting code improvement`);
    console.log(`improveCode: Original code length: ${code.length} characters`);
    console.log(`improveCode: Feedback length: ${feedback.length} characters`);
  
    const codeContext = await this.rag.getRelevantContext("membrane driver code structure and best practices", "code_generation");
    console.log(`improveCode: Retrieved code context length: ${codeContext.length} characters`);
    
    const instructions = this.getCodeGeneratorInstructions() + `
    Improve the provided Membrane driver code based on the given feedback. Follow these rules strictly:
    1. Output only the improved TypeScript code, without any explanations or comments.
    2. Ensure the output is valid TypeScript for a Membrane driver.
    3. Address the issues identified in the feedback.
    4. Maintain consistency with Membrane driver standards and best practices.
  
    DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
    Begin the TypeScript code with the necessary imports and end with any exports required for a Membrane driver.
    `;
  
    const fullContext = `
    Original Code:
    ${code}
  
    Feedback:
    ${feedback}

    API Summary:
    ${analyzedApi}
  
    Additional context:
    ${codeContext}
    `;
  
    console.log(`improveCode: Full context length (including instructions): ${instructions.length + fullContext.length} characters`);
  
    const improvedCode = await this.llm.generate(instructions, fullContext);
    console.log(`improveCode: Improved code length: ${improvedCode.length} characters`);
  
    return improvedCode;
  }

  async improveDocs(docs: string, code: string, feedback: string): Promise<string> {
    const docsContext = await this.rag.getRelevantContext("membrane driver documentation best practices", "documentation");
    
    const instructions = `
    Improve the provided README.md for a Membrane driver based on the given feedback. Follow these rules strictly:
    1. Output only the improved markdown content, without any explanations or comments.
    2. Ensure the output is valid markdown for a README file.
    3. Address the issues identified in the feedback.
    4. Maintain consistency with Membrane documentation standards and best practices.

    DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
    Begin the markdown content with the appropriate heading and structure for a README file.
    `;

    const fullContext = `
    Original README:
    ${docs}

    Feedback:
    ${feedback}

    Driver Code:
    ${code}

    Additional context:
    ${docsContext}
    `;

    return this.llm.generate(instructions, fullContext);
  }

  async improveSchema(schema: string, feedback: string): Promise<string> {
    const schemaContext = await this.rag.getRelevantContext("membrane driver schema design", "schema_design");
    
    const instructions = this.getConfigGeneratorInstructions() + `
    Improve the provided memconfig.json for a Membrane driver based on the given feedback. Follow these rules strictly:
    1. Output only the improved JSON content, without any explanations or comments.
    2. Ensure the output is valid JSON for a Membrane driver configuration.
    3. Address the issues identified in the feedback.
    4. Maintain consistency with Membrane schema standards and best practices.

    DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
    Begin the JSON content with the opening curly brace and ensure it's properly formatted.
    `;

    const fullContext = `
    Original memconfig.json:
    ${schema}

    Feedback:
    ${feedback}

    Additional context:
    ${schemaContext}
    `;

    return this.llm.generate(instructions, fullContext);
  }

  async improvePackageJson(packageJson: string, feedback: string): Promise<string> {
    const packageContext = await this.rag.getRelevantContext("membrane driver package.json configuration", "configuration");
    
    const instructions = `
    Improve the provided package.json for a Membrane driver based on the given feedback. Follow these rules strictly:
    1. Output only the improved JSON content, without any explanations or comments.
    2. Ensure the output is valid JSON for a package.json file.
    3. Address the issues identified in the feedback.
    4. Maintain consistency with Node.js and Membrane package.json standards and best practices.

    DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
    Begin the JSON content with the opening curly brace and ensure it's properly formatted.
    `;

    const fullContext = `
    Original package.json:
    ${packageJson}

    Feedback:
    ${feedback}

    Additional context:
    ${packageContext}
    `;

    return this.llm.generate(instructions, fullContext);
  }

  // Instructions

private getApiAnalyzerInstructions(): string {
  return `
  Analyze the provided API documentation and extract the following information:
  1. Base URL of the API
  2. Authentication methods
  3. Return only REST API endpoints, including:
    - HTTP method (GET, POST, PUT, DELETE, etc.)
    - Path
    - Query parameters
    - Request body parameters
    - Response type and structure
  4. Any special parameters or options that apply to multiple endpoints
  5. Data models or schemas used by the API

  Ensure that ALL endpoints mentioned in the API documentation are included in your analysis.

  Format your response as a JSON object with the following structure:
  {
    "baseUrl": "string",
    "authMethods": ["string"],
    "endpoints": [
      {
        "path": "string",
        "method": "string",
        "description": "string",
        "parameters": [{"name": "string", "type": "string", "required": boolean}],
        "responseType": "string"
      }
    ],
    "dataModels": [
      {
        "name": "string",
        "fields": [{"name": "string", "type": "string"}]
      }
    ]
  }
  `;
}

private getConfigGeneratorInstructions(): string {
  return `
  Generate a memconfig.json file for a Membrane driver based on the analyzed API. Follow these rules:
  1. Output only valid JSON for a Membrane driver configuration.
  2. Include a complete schema definition based on the analyzed API.
  3. Define all necessary types, including Root, with appropriate fields, actions, and events.
  4. Define all necessary dependencies (usually only "http").
  5. When generating or improving memconfig schema:
    - Use the built-in types (Boolean, Int, Float, String, Json, Void, List, Ref) for basic data.
    - Define and use custom types in the memconfig.json file for more complex structures.
    - Ensure all custom types are properly defined in the schema and used consistently in the code.
    - Remember that all custom types will ultimately be composed of the built-in types.
    - When writing tests or type checks, consider both built-in and custom types.

    Use this example structure:
    {
      "schema": {
        "types": [
          {
            "name": "Root",
            "actions": [
              {
                "name": "configure",
                "type": "Void",
                "params": [
                  {
                    "name": "apiKey",
                    "type": "String"
                  }
                ]
              },
              {
                "name": "getUser",
                "type": "User",
                "params": [
                  {
                    "name": "id",
                    "type": "String"
                  }
                ]
              }
            ],
            "fields": [
              {
                "name": "status",
                "type": "String"
              }
            ]
          },
          {
            "name": "User",
            "fields": [
              {
                "name": "id",
                "type": "String"
              },
              {
                "name": "name",
                "type": "String"
              },
              {
                "name": "email",
                "type": "String"
              }
            ]
          }
        ]
      },
      "dependencies": {
        "http": "http:"
      }
    }
  `;
}

private getCodeGeneratorInstructions(): string {
  return `
  Generate Membrane driver code based on the provided memconfig.json and analyzed API. Follow these rules strictly:
  1. Output only valid TypeScript code for a Membrane driver.
  2. Do not include any explanations or comments.
  3. Implement all types, actions, and fields defined in the schema.
  4. Use the analyzed API to guide the implementation of actions.
  5. Include necessary imports from the Membrane framework.
  6. Ensure the code is complete and can be executed as-is.
  7. Make sure to completely implement the api function similar to how it is in the example structure.
  8. For each endpoint, include all relevant parameters, including any special options or configurations.
  9. Implement ALL endpoints found in the API analysis.

  When generating the driver, follow this structure:
  1. Import Statement: Import necessary modules from Membrane and external libraries.
  2. State Management: Define and initialize the state.
  3. Root Object: Define the Root object with configuration, status, and main API endpoints.
  4. Collection Objects: Create collection objects with 'one' and 'page' methods.
  5. Resource Objects: Define resource objects representing individual resources.
  6. Helper Functions: Implement utility functions for pagination and API interactions.
  7. Webhook Handling: Include functions for managing webhooks if supported.
  8. Error Handling: Implement consistent error handling.
  9. Type Definitions: Use TypeScript types and interfaces.
  10. Documentation: Include comments for complex logic.
  11. Testing: Implement a Tests object to verify functionality.
  12. Event Subscriptions: Implement methods for API event handling if applicable.

  When generating or improving Membrane drivers:
  - Use the built-in types (Boolean, Int, Float, String, Json, Void, List, Ref) for basic data.
  - Ensure all custom types are properly defined in the schema and used consistently in the code.
  - Remember that all custom types will ultimately be composed of the built-in types.
  - When writing tests or type checks, consider both built-in and custom types.

  Fields: queryable nodes and values
  Actions: invocable functions on a node
  Events: subscribable notifications

  Membrane cannot handle Websocket Connections, so leave Websocket requests out of the code.

  DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
  DO NOT WRAP RETURNED CODE IN A CODE BLOCK

  Add a page method on a collection if the api uses pagination. It will return items (list of resource) and next (a reference to
  the next page). If the api doesn't have pagination just set next to null.
  
  Begin the TypeScript code with the necessary imports and end with any exports required for a Membrane driver.

  Follow this structure and implement all the actual API calls provided by the Analyzed API.

  Example Structure:
  import { state, nodes, root } from "membrane";

  const baseUrl = \`api.example.com/v1\`;

  type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  state.webhooks = state.webhooks ?? {};

  async function api(
    method: Method,
    path: string,
    query?: any,
    body?: string | object
  ) {
    if (!state.API_KEY) {
      throw new Error("You must be authenticated to use this API.");
    }

    const queryString = query ? \`?\${new URLSearchParams(query)}\` : "";
    const url = \`https://\${baseUrl}/\${path}\${queryString}\`;

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": \`Bearer \${state.API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(\`API request failed: \${response.status} \${response.statusText}\`);
    }

    return response.json();
  }

  export const Root = {
    status() {
      return state.API_KEY ? "Configured" : "Not configured";
    },
    resources: () => ({}),
    users: () => ({}),
    configure: async ({ API_KEY }) => {
      state.API_KEY = API_KEY;
    },
    parse: async ({ name, value }) => {
      switch (name) {
        case "resource":
          return [root.resources.one({ id: value })];
        case "user":
          return [root.users.one({ id: value })];
        default:
          return [];
      }
    },
  };

  export const Tests = {
    testGetResources: async () => {
      const resources = await root.resources.page({ limit: 10 }).$query(\`{ items { id } }\`);
      return Array.isArray(resources.items);
    },
    testCreateResource: async () => {
      const newResource = await root.resources.create({ name: "Test Resource" });
      return !!newResource.id;
    },
    testUpdateResource: async () => {
      const resource = await root.resources.one({ id: "test-id" });
      const updated = await resource.update({ name: "Updated Resource" });
      return updated.name === "Updated Resource";
    },
    testDeleteResource: async () => {
      const resource = await root.resources.one({ id: "test-id" });
      await resource.delete();
      return true;
    },
  };

  export const ResourceCollection = {
    async one({ id }) {
      return await api("GET", \`resources/\${id}\`);
    },
    async page({ cursor, limit = 10 }) {
      const response = await api("GET", "resources", { cursor, limit });
      return {
        items: response.items,
        next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
      };
    },
    async create(args) {
      return await api("POST", "resources", null, args);
    },
  };

  export const Resource = {
    gref: (_, { obj }) => root.resources.one({ id: obj.id }),
    async update(args, { self }) {
      const { id } = self.$argsAt(root.resources.one);
      return await api("PATCH", \`resources/\${id}\`, null, args);
    },
    async delete(_, { self }) {
      const { id } = self.$argsAt(root.resources.one);
      await api("DELETE", \`resources/\${id}\`);
    },
    changed: {
      async subscribe(_, { self }) {
        const { id } = self.$argsAt(root.resources.one);
        await ensureWebhook(id);
      },
      async unsubscribe(_, { self }) {
        const { id } = self.$argsAt(root.resources.one);
        await removeWebhook(id);
      },
    },
  };

  export const UserCollection = {
    async one({ id }) {
      return await api("GET", \`users/\${id}\`);
    },
    async page({ cursor, limit = 10 }) {
      const response = await api("GET", "users", { cursor, limit });
      return {
        items: response.items,
        next: response.next_cursor ? self.page({ cursor: response.next_cursor, limit }) : null,
      };
    },
  };

  export const User = {
    gref: (_, { obj }) => root.users.one({ id: obj.id }),
    async update(args, { self }) {
      const { id } = self.$argsAt(root.users.one);
      return await api("PATCH", \`users/\${id}\`, null, args);
    },
  };

  export async function endpoint({ path, body }) {
    if (path === "/webhook") {
      const event = JSON.parse(body);
      await dispatchEvent(event.resource_id, event.type);
    }
  }

  async function dispatchEvent(resourceId: string, eventType: string) {
    const resource = root.resources.one({ id: resourceId });
    await resource.changed.$emit({ type: eventType });
  }

  async function ensureWebhook(resourceId: string) {
    const webhook = await api("POST", "webhooks", null, {
      resource_id: resourceId,
      url: state.endpointUrl + "/webhook",
    });
    state.webhooks[resourceId] = webhook.id;
  }

  async function removeWebhook(resourceId: string) {
    const webhookId = state.webhooks[resourceId];
    if (webhookId) {
      await api("DELETE", \`webhooks/\${webhookId}\`);
      delete state.webhooks[resourceId];
    }
  }

  export async function refreshWebhook({ id }) {
    await api("POST", \`webhooks/\${id}/refresh\`);
  }
  `;
}

private getDocsWriterInstructions(name): string {
  return `
  Write documentation for the Membrane driver. Follow these rules:
  1. Output only valid markdown content for a README.md file.
  2. Include a clear and concise description of the driver's purpose and functionality.
  3. Provide installation instructions.
  4. List and explain all available actions, fields, and events.
  5. Include examples of how to use the driver.
  6. Document any configuration requirements or options.
  7. Mention any dependencies or requirements for using the driver.
  8. Include a section on error handling and troubleshooting.
  9. Add a section on contributing to the driver (if applicable).
  10. Include license information.

  Structure the README.md as follows:
  1. Title: ${name} and brief description
  2. Installation
  3. Configuration (Invoke the configure action in the Membrane Navigator with your API key)
  4. Usage
    - Actions
    - Fields
    - Events
  5. Examples
  6. Error Handling
  7. Contributing (if applicable)
  8. License

  DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
  Begin the markdown content with the appropriate heading and structure for a README file.
  `;
}

private getPackageJsonGeneratorInstructions(name): string {
  return `
  Generate a package.json file for a Membrane driver. Follow these rules:
  1. Output only valid JSON for a package.json file.
  2. Include the correct name, version, and license fields.
  3. Include only dependencies that are actually used in the generated code.
  4. List all necessary dependencies based on the analyzed API.

  ONLY INCLUDE A DEPENDENCY IF IT IS IMPORTED IN THE CODE.

  Use this structure:
  {
    "name": "${name}",
    "version": "1.0.0",
    "license": "ISC",
    "dependencies": {
      // List dependencies here (only if there is a correspondin import in the code file)
    }
  }

  DO NOT INCLUDE EXPLANATORY TEXT IN THE OUTPUT.
  Begin the JSON content with the opening curly brace and ensure it's properly formatted.
  `;
}

private getDriverValidatorInstructions(): string {
  return `
  Validate if this Membrane driver adheres to Membrane standards and correctly implements the given memconfig.json. Follow these rules strictly:
  1. Check that the code (index.ts) contains only valid TypeScript and implements all types, actions, and fields defined in the memconfig.json schema.
  2. Verify that the memconfig.json is valid JSON, correctly defines the schema, and includes all necessary dependencies.
  3. Ensure that the package.json is valid JSON, includes all required dependencies, and has the correct name and version.
  4. Do not provide any explanations or comments in your response.

  Respond with exactly "VALID" if everything is correct, or "INVALID" if any issues are found.

  Example Response:
  VALID
  `;
}

}
