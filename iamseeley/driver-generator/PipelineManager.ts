/**
* Pipeline Manager for Membrane Driver Generation
* Orchestrates the end-to-end process of generating, validating, and improving API drivers
* through a series of pipeline steps. Manages driver state and checkpoints throughout the
* generation lifecycle.
*/
import { LLM } from "./llm";
import { RAG } from "./rag";
import { StepExecutor, PipelineStep } from "./StepExecutor";
import { DriverData, DriverCheckpoint, ValidationResult, ImprovementComponent } from "./types";
import { CheckpointManager } from "./CheckpointManager";
import { state } from 'membrane';

const fileForComponent: Record<ImprovementComponent, string> = {
  'all': '',
  'code': 'index.ts',
  'schema': 'memconfig.json',
  'docs': 'README.md',
  'package': 'package.json'
};

export class PipelineManager {
  private stepExecutor: StepExecutor;
  private llm: LLM;
  private checkpointManager: CheckpointManager;

  constructor(llm: LLM, rag: RAG) {
    this.stepExecutor = new StepExecutor(llm, rag);
    this.llm = llm;
    this.checkpointManager = new CheckpointManager();
  }

  async generateDriver(apiSpec: string, name: string): Promise<DriverData> {
    console.log(`Starting driver generation for ${name}`);
    
    const driver: DriverData = {
      name,
      apiSpec,
      analyzedApi: null,
      isValid: false,
      files: {
        'index.ts': '',
        'memconfig.json': '',
        'README.md': '',
        'package.json': ''
      },
      checkpoints: {},
      currentCheckpoint: -1
    };
    
    try {
      const steps: PipelineStep[] = [
        { name: "Analyze API", agent: "ApiAnalyzer", method: "execute" },
        { name: "Generate Config", agent: "ConfigGenerator", method: "execute" },
        { name: "Generate Code", agent: "CodeGenerator", method: "execute" },
        { name: "Generate Docs", agent: "DocsGenerator", method: "execute" },
        { name: "Generate Package JSON", agent: "PackageJsonGenerator", method: "execute" }
      ];
  
      let currentInput = { 
        apiSpec, 
        name,
        files: driver.files,
        analyzedApi: driver.analyzedApi
      };
  
      for (const step of steps) {
        const stepOutput = await this.stepExecutor.execute(step, currentInput);
        
        switch (step.name) {
          case "Analyze API":
            driver.analyzedApi = stepOutput;
            break;
          case "Generate Config":
            driver.files['memconfig.json'] = stepOutput;
            break;
          case "Generate Code":
            driver.files['index.ts'] = stepOutput;
            break;
          case "Generate Docs":
            driver.files['README.md'] = stepOutput;
            break;
          case "Generate Package JSON":
            driver.files['package.json'] = stepOutput;
            break;
        }
        
        currentInput = { 
          ...currentInput,
          files: driver.files,
          analyzedApi: driver.analyzedApi
        };
      }
      
      // Store driver in state before validation
      state.drivers[name] = driver;
      
      // Add validation step after generation
      console.log("Validating newly generated driver...");
      const validation = await this.validateDriver(name);
      
      // Update driver with validation results
      driver.isValid = validation.isValid;
      driver.validationErrors = validation.errors;
      driver.improvementPlan = validation.improvementPlan;
      
      // Create checkpoint after validation
      this.checkpointManager.createCheckpoint(driver, "Initial generation");
      
      console.log(`✨ Driver generation ${validation.isValid ? 'succeeded' : 'completed with validation errors'} for ${name}`);
      return driver;
      
    } catch (error) {
      console.error(`❌ Driver generation failed for ${name}:`, error);
      driver.validationErrors = [{ 
        component: 'code', 
        message: error.message, 
        severity: 'error' 
      }];
      return driver;
    }
  }

  async validateDriver(name: string): Promise<ValidationResult> {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver not found: ${name}`);
    }
  
    console.log(`\n🔍 Validating driver "${name}"...`);
    
    try {
      const analyzedApiObj = typeof driver.analyzedApi === 'string' 
        ? JSON.parse(driver.analyzedApi)
        : driver.analyzedApi;
  
      // Log file sizes for context
      console.log('📁 Current driver files:');
      Object.entries(driver.files).forEach(([filename, content]) => {
        if (typeof content === 'string') {
          console.log(`   - ${filename}: ${content.length} bytes`);
        }
      });
  
      const validation = await this.stepExecutor.execute(
        { name: "Validate Driver", agent: "DriverValidator", method: "execute" },
        {
          files: driver.files,
          analyzedApi: analyzedApiObj,
          name: driver.name
        }
      ) as ValidationResult;
  
      // Update driver with validation results
      driver.isValid = validation.isValid;
      driver.validationErrors = validation.errors;
      driver.improvementPlan = validation.improvementPlan;
  
      // Log validation outcome
      if (validation.isValid) {
        console.log('✅ Validation passed - schema is valid');
      } else {
        console.log('\n❌ Validation failed with schema issues:');
        validation.errors.forEach(error => {
          const icon = error.severity === 'error' ? '🔴' : '⚠️';
          console.log(`   ${icon} [${error.component.toUpperCase()}] ${error.message}`);
          if (error.suggestion) {
            console.log(`      💡 ${error.suggestion}`);
          }
        });
      }
  
      return validation;
  
    } catch (error) {
      console.error("❌ Error during schema validation:", error);
      return {
        isValid: false,
        errors: [{ 
          component: 'schema',
          message: error.message, 
          severity: 'error' 
        }]
      };
    }
  }

  async validateAndImprove(name: string): Promise<DriverData> {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver not found: ${name}`);
    }
  
    console.log(`Starting driver validation loop for ${name}`);
    
    try {
      const MAX_ITERATIONS = 3;
      let iterations = 0;
  
      while (iterations < MAX_ITERATIONS) {
        console.log(`\n📋 Validation Iteration ${iterations + 1}/${MAX_ITERATIONS}`);
        
        const validation = await this.validateDriver(name);
        
        // Log validation results
        if (validation.isValid) {
          console.log('✅ Validation succeeded');
          
          // Create checkpoint for successful validation
          this.checkpointManager.createCheckpoint(
            driver,
            `Validation succeeded iteration ${iterations + 1}`,
            validation
          );
          break;
        }
  
        console.log('❌ Validation failed with issues:');
        validation.errors.forEach(error => {
          const icon = error.severity === 'error' ? '🔴' : '⚠️';
          console.log(`${icon} [${error.component.toUpperCase()}] ${error.message}`);
          if (error.suggestion) {
            console.log(`   💡 Suggestion: ${error.suggestion}`);
          }
        });
  
        if (!validation.improvementPlan?.suggestions?.length) {
          console.warn('⚠️ No improvement suggestions provided by validator');
          break;
        }
  
        // Create pre-improvement checkpoint
        this.checkpointManager.createCheckpoint(
          driver,
          `Before improvements iteration ${iterations + 1}`,
          validation
        );
  
        console.log('\n🔧 Applying schema improvements...');
        
        try {
          // 1. Improve the schema first
          const improvedSchema = await this.stepExecutor.execute(
            { name: "Improve Schema", agent: "ImproveSchema", method: "execute" },
            { 
              schema: driver.files['memconfig.json'],
              feedback: validation.improvementPlan.suggestions[0]
            }
          );
  
          // Update the schema file
          driver.files['memconfig.json'] = improvedSchema;
  
          // Create checkpoint after schema improvement
          this.checkpointManager.createCheckpoint(
            driver,
            `Schema improved iteration ${iterations + 1}`,
            validation
          );
  
          // 2. Regenerate the code with the new schema
          console.log('\n🔄 Regenerating code with updated schema...');
          const improvedCode = await this.stepExecutor.execute(
            { name: "Generate Code", agent: "CodeGenerator", method: "execute" },
            {
              memconfig: improvedSchema,
              analyzedApi: driver.analyzedApi,
            }
          );
  
          // Update the code file
          driver.files['index.ts'] = improvedCode;
  
          // Create checkpoint after code regeneration
          this.checkpointManager.createCheckpoint(
            driver,
            `Code regenerated iteration ${iterations + 1}`,
            validation
          );
  
        } catch (error) {
          console.error(`❌ Error during validation iteration ${iterations + 1}:`, error);
          break;
        }
  
        iterations++;
      }
  
      if (iterations === MAX_ITERATIONS) {
        console.log('\n⚠️ Reached maximum validation iterations');
        // Create final checkpoint if we hit max iterations
        this.checkpointManager.createCheckpoint(
          driver,
          `Max iterations reached`,
          { isValid: driver.isValid, errors: driver.validationErrors || [] }
        );
      }
  
      return driver;
  
    } catch (error) {
      console.error("❌ Error during driver validation loop:", error);
      return driver;
    }
  }
  
  async improveComponent(
    driver: DriverData, 
    component: ImprovementComponent,
    componentSuggestions: string
  ): Promise<Partial<Record<keyof typeof fileForComponent, string>>> {
    const step = this.getStepForTarget(component);
    if (!step) {
      throw new Error(`Invalid improvement target: ${component}`);
    }
  
    // Extract the errors and suggestions from the component suggestions string
    const errors = componentSuggestions
      .split('\n')
      .filter(line => line.includes('ERROR:') || line.includes('WARNING:'))
      .map(error => error.trim());
  
    console.log(`Improving ${component} with ${errors.length} improvements to apply`);
  
    // Execute the improvement with the component-specific suggestions
    const result = await this.stepExecutor.execute(step, { 
      ...driver,
      files: driver.files,
      feedback: componentSuggestions,
      analyzedApi: driver.analyzedApi,
      currentFile: driver.files[fileForComponent[component]]
    });
    
    if (component === 'all') {
      return {};
    }
  
    return { [fileForComponent[component]]: result };
  }


  async improveSpecificPart(
    driverId: string,
    feedback: string,
    target: ImprovementComponent
  ): Promise<DriverData> {
    const driver = state.drivers[driverId];
    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }
  
    const step = this.getStepForTarget(target);
    if (!step) {
      throw new Error(`Invalid improvement target: ${target}`);
    }
  
    // Save pre-improvement state
    this.checkpointManager.createCheckpoint(
      driver,
      `Pre-${target}-improvement: ${feedback.slice(0, 50)}...`
    );
  
    try {
      const currentInput = { ...driver, feedback };
      const improved = await this.stepExecutor.execute(step, currentInput);
      
      if (target !== 'all') {
        driver.files[fileForComponent[target]] = improved;
      }
  
      const validation = await this.validateDriver(driverId);
      
      // Create checkpoint after improvement regardless of validation result
      this.checkpointManager.createCheckpoint(
        driver,
        validation.isValid ? `Successful ${target} improvement` : `Failed ${target} improvement`,
        validation
      );
  
      return driver;
  
    } catch (error) {
      console.error(`Error during ${target} improvement:`, error);
      return driver;
    }
  }

  private async determineImprovementPlan(feedback: string): Promise<ImprovementComponent[]> {
    const prompt = `
    Based on the following feedback for a Membrane driver, determine which components need improvement.
    Respond with a JSON array containing one or more of the following options: "code", "schema", "docs", "package".
    Only include components that definitely need improvement based on the feedback.

    Feedback:
    ${feedback}

    JSON Response:
    `;

    const response = await this.llm.complete(prompt);
    let plan: ImprovementComponent[];
    
    try {
      plan = JSON.parse(response);
      if (!Array.isArray(plan) || plan.some(item => !["code", "schema", "docs", "package", "all"].includes(item))) {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      plan = ["code", "schema", "docs", "package"];
    }

    return plan;
  }

  private getStepForTarget(target: ImprovementComponent): PipelineStep | null {
    const stepMap: Record<ImprovementComponent, PipelineStep | undefined> = {
      "all": undefined,
      "code": { name: "Improve Code", agent: "ImproveCode", method: "execute" },
      "schema": { name: "Improve Schema", agent: "ImproveSchema", method: "execute" },
      "docs": { name: "Improve Docs", agent: "ImproveDocs", method: "execute" },
      "package": { name: "Improve Package JSON", agent: "ImprovePackageJson", method: "execute" }
    };

    return stepMap[target] || null;
  }

  async rollbackDriver(driverId: string, checkpointId: number): Promise<DriverData> {
    const driver = state.drivers[driverId];
    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }

    this.checkpointManager.rollbackToCheckpoint(driver, checkpointId);
    return driver;
  }

  getDriverCheckpoints(driverId: string): DriverCheckpoint[] {
    return this.checkpointManager.getAllCheckpoints(driverId);
  }

  getDriver(driverId: string): DriverData | null {
    return state.drivers[driverId] || null;
  }

  getAllDrivers(): DriverData[] {
    return Object.values(state.drivers);
  }

  deleteDriver(driverId: string): void {
    delete state.drivers[driverId];
    this.checkpointManager.clear(driverId);
  }
}