import { LLM } from "./llm";
import { RAG } from "./rag";
import { ValidationError, ValidationImprovementPlan, ValidationResult } from "./types";
import * as z from "zod";

// Zod schemas for memconfig validation 
const SchemaParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  optional: z.boolean().optional(),
  ofType: z.string().optional(),
}).strict();

const SchemaMemberSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  params: z.array(SchemaParameterSchema).optional(),
  ofType: z.string().optional(),
}).strict();

const SchemaTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  fields: z.array(SchemaMemberSchema).optional(),
  actions: z.array(SchemaMemberSchema).optional(),
  events: z.array(SchemaMemberSchema).optional()
}).strict().refine(
  data => data.fields || data.actions || data.events,
  "Type must have at least one of: fields, actions, or events"
);

const MemconfigSchema = z.object({
  schema: z.object({
    types: z.array(SchemaTypeSchema)
  }).refine(
    data => data.types.some(type => type.name === "Root"),
    "Schema must include a Root type"
  ),
  dependencies: z.record(z.string()).optional()
}).strict();

export class DriverValidatorAgent {
  constructor(private llm: LLM, private rag: RAG) {}

  async execute(input: {
    code: string;
    memconfig: string;
    apiSummary: string;
  }): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      // Parse memconfig
      const memconfigJson = JSON.parse(input.memconfig);
      const memconfigResult = MemconfigSchema.safeParse(memconfigJson);
      
      if (!memconfigResult.success) {
        errors.push(...this.convertZodErrors(memconfigResult.error));
        return {
          isValid: false,
          errors,
          improvementPlan: await this.createImprovementPlan(errors)
        };
      }

      const memconfig = memconfigResult.data;

      // Validate API coverage
      const apiCoverageErrors = await this.validateApiCoverage(
        memconfig,
        input.apiSummary
      );
      errors.push(...apiCoverageErrors);

      // Validate code implementation
      const codeErrors = this.validateCodeImplementation(
        input.code,
        memconfig.schema.types
      );
      errors.push(...codeErrors);

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          improvementPlan: await this.createImprovementPlan(errors)
        };
      }

      return { isValid: true, errors: [] };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        errors: [{
          component: 'code',
          message: `Validation error: ${message}`,
          severity: 'error'
        }]
      };
    }
  }

  private async validateApiCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: string
  ): Promise<ValidationError[]> {
    const prompt = `
      Compare this API summary against the Membrane driver schema and identify only MISSING endpoints/operations.
      Do NOT compare or validate types - Membrane uses its own type system.
      
      API Summary:
      ${apiSummary}
      
      Membrane Schema:
      ${JSON.stringify(memconfig.schema, null, 2)}
      
      Rules:
      - Only check if operations/endpoints exist in the schema
      - Ignore type differences (e.g. String vs Binary, Json vs specific types)
      - Ignore parameter type differences
      - Don't suggest type changes
      
      Format response as JSON array of objects with properties:
      - component: "schema"
      - message: description of missing endpoint/operation
      - severity: "error"
      - suggestion: how to add the missing endpoint/operation
      
      Return empty array if all endpoints are covered.
    `;
  
    const response = await this.llm.complete(prompt);
    try {
      const errors = JSON.parse(response);
      // Filter out any type-related validations that might slip through
      return errors.filter(error => 
        !error.message.toLowerCase().includes('type') && 
        !error.suggestion.toLowerCase().includes('type')
      );
    } catch (error) {
      console.error("Error parsing LLM response for API coverage:", error);
      return [];
    }
  }

  private validateCodeImplementation(
    code: string,
    schemaTypes: z.infer<typeof SchemaTypeSchema>[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const type of schemaTypes) {
      // Check for type export
      const typeExportRegex = new RegExp(
        `export\\s+const\\s+${type.name}\\s*=\\s*{`, 
        'm'
      );
      if (!typeExportRegex.test(code)) {
        errors.push({
          component: 'code',
          message: `Missing implementation for schema type: ${type.name}`,
          severity: 'error',
          suggestion: `Add export const ${type.name} = { ... }`
        });
        continue;
      }

      // Check fields - for Root type fields are typically sync functions or objects
      if (type.name === 'Root') {
        type.fields?.forEach(field => {
          // Match either field: () => ... or field: () => ({ ... })
          const fieldRegex = new RegExp(
            `${field.name}\\s*:\\s*\\(\\)\\s*=>\\s*(?:{|\\()`, 
            'm'
          );
          if (!fieldRegex.test(code)) {
            errors.push({
              component: 'code',
              message: `Missing or invalid field implementation: ${field.name} in Root`,
              severity: 'error',
              suggestion: this.generateRootFieldSuggestion(field)
            });
          }
        });
      } else {
        // For non-Root types, fields may be async
        type.fields?.forEach(field => {
          const fieldRegex = new RegExp(
            `${field.name}\\s*:`, 
            'm'
          );
          if (!fieldRegex.test(code)) {
            errors.push({
              component: 'code',
              message: `Missing field implementation: ${field.name} in ${type.name}`,
              severity: 'error',
              suggestion: this.generateFieldSuggestion(field)
            });
          }
        });
      }

      // Check actions - always async
      type.actions?.forEach(action => {
        const actionRegex = new RegExp(
          `${action.name}\\s*:\\s*async`, 
          'm'
        );
        if (!actionRegex.test(code)) {
          errors.push({
            component: 'code',
            message: `Missing or non-async action implementation: ${action.name} in ${type.name}`,
            severity: 'error',
            suggestion: this.generateActionSuggestion(action)
          });
        }
      });
    }

    return errors;
  }

  private convertZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.errors.map(err => ({
      component: "schema",
      message: err.message,
      path: err.path.map(String),
      severity: "error",
      suggestion: `Fix the schema validation error: ${err.message}`
    }));
  }

  private generateRootFieldSuggestion(field: any): string {
    if (field.type === "Object") {
      return `${field.name}: () => ({}),`;
    }
    return `${field.name}: () => {
    // TODO: Implement field
    return null;
  },`;
  }

  private generateFieldSuggestion(field: any): string {
    if (field.params) {
      const params = field.params.map(p => p.name).join(', ');
      return `${field.name}: async ({ ${params} }) => {
    // TODO: Implement field
    return null;
  },`;
    }
    return `${field.name}: {
    // TODO: Implement field
  },`;
  }

  private generateActionSuggestion(action: any): string {
    const params = action.params?.map(p => p.name).join(', ') || '';
    return `${action.name}: async ({ ${params} }) => {
    // TODO: Implement action
  },`;
  }

  private async createImprovementPlan(
    errors: ValidationError[]
  ): Promise<ValidationImprovementPlan> {
    const errorsByComponent = errors.reduce((acc, error) => {
      if (!acc[error.component]) {
        acc[error.component] = [];
      }
      acc[error.component].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    // Sort errors by severity
    Object.values(errorsByComponent).forEach(componentErrors => {
      componentErrors.sort((a, b) => 
        a.severity === 'error' ? -1 : b.severity === 'error' ? 1 : 0
      );
    });

    const suggestions = Object.entries(errorsByComponent).map(([component, errors]) => {
      const componentSuggestions = errors
        .filter(e => e.suggestion)
        .map(e => `${e.severity.toUpperCase()}: ${e.message}\n${e.suggestion}`);

      return `${component.toUpperCase()} Improvements:\n${componentSuggestions.join('\n\n')}`;
    });

    return {
      components: Object.keys(errorsByComponent) as ("schema" | "code")[],
      suggestions,
      prompt: `Please address the following validation issues:\n\n${suggestions.join('\n\n')}`
    };
  }
}