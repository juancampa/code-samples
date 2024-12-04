import { LLM } from "./llm";
import { RAG } from "./rag";
import { ApiAnalyzerAgent } from "./ApiAnalyzerAgent";
import { ConfigGeneratorAgent } from "./ConfigGenAgent";
import { CodeGeneratorAgent } from "./CodeGenAgent";
import { DocsGeneratorAgent } from "./DocsGenAgent";
import { PackageJsonGeneratorAgent } from "./PackageJsonGenAgent";
import { DriverValidatorAgent } from "./DriverValidatorAgent";
import { ImproveCodeAgent } from "./ImproveCodeAgent";
import { ImproveSchemaAgent } from "./ImproveSchemaAgent";
import { ImproveDocsAgent } from "./ImproveDocsAgent";
import { ImprovePackageJsonAgent } from "./ImprovePackageJsonAgent";

export interface PipelineStep {
  name: string;
  agent: string;
  method: string;
}

export class StepExecutor {
  private llm: LLM;
  private rag: RAG;
  private agents: {[key: string]: any};

  constructor(llm: LLM, rag: RAG) {
    this.llm = llm;
    this.rag = rag;
    this.agents = {
      ApiAnalyzer: new ApiAnalyzerAgent(llm, rag),
      ConfigGenerator: new ConfigGeneratorAgent(llm, rag),
      CodeGenerator: new CodeGeneratorAgent(llm, rag),
      DocsGenerator: new DocsGeneratorAgent(llm, rag),
      PackageJsonGenerator: new PackageJsonGeneratorAgent(llm, rag),
      DriverValidator: new DriverValidatorAgent(llm, rag),
      ImproveCode: new ImproveCodeAgent(llm, rag),
      ImproveSchema: new ImproveSchemaAgent(llm, rag),
      ImproveDocs: new ImproveDocsAgent(llm, rag),
      ImprovePackageJson: new ImprovePackageJsonAgent(llm, rag)
    };
  }

  async execute(step: PipelineStep, input: any): Promise<any> {
    console.log(`Executing step: ${step.name}`);
    const agent = this.agents[step.agent];
    if (!agent) {
      throw new Error(`Unknown agent: ${step.agent}`);
    }
    if (typeof agent[step.method] !== 'function') {
      throw new Error(`Unknown method ${step.method} for agent ${step.agent}`);
    }

    let agentInput;
    switch (step.name) {
      case "Analyze API":
        agentInput = input.apiSpec;
        break;
      case "Generate Config":
        agentInput = { analyzedApi: input.analyzedApi };
        break;
      case "Generate Code":
        agentInput = { 
          memconfig: input.files['memconfig.json'], 
          analyzedApi: input.analyzedApi 
        };
        break;
      case "Generate Docs":
        agentInput = { 
          memconfig: input.files['memconfig.json'], 
          code: input.files['index.ts'], 
          name: input.name 
        };
        break;
      case "Generate Package JSON":
        agentInput = { 
          name: input.name, 
          code: input.files['index.ts'] 
        };
        break;
      case "Validate Driver":
        agentInput = {
          code: input.files['index.ts'],
          memconfig: input.files['memconfig.json'],
          apiSummary: input.analyzedApi || ''
        };
        break;
      case "Improve Code":
        agentInput = {
          code: input.files['index.ts'],
          feedback: input.feedback,
          analyzedApi: input.analyzedApi
        };
        break;
      case "Improve Schema":
        agentInput = { 
          schema: input.files['memconfig.json'], 
          feedback: input.feedback 
        };
        break;
      case "Improve Docs":
        agentInput = {
          docs: input.files['README.md'],
          code: input.files['index.ts'],
          feedback: input.feedback,
          name: input.name
        };
        break;
      case "Improve Package JSON":
        agentInput = { 
          packageJson: input.files['package.json'], 
          feedback: input.feedback,
          name: input.name
        };
        break;
      default:
        agentInput = input;
    }
    return await agent[step.method](agentInput);
  }
}