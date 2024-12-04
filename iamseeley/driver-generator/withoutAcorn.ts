import { LLM } from "./llm";
import { RAG } from "./rag";
import * as z from "zod";
import { ValidationError, ValidationImprovementPlan, ValidationResult } from "./types";


// zod schemas
// memconfig
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

// api summary 
const ApiParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string().optional()
});

const ApiEndpointSchema = z.object({
  path: z.string(),
  method: z.string(),
  description: z.string(),
  parameters: z.array(ApiParameterSchema),
  requestBody: z.object({
    type: z.string(),
    properties: z.record(z.any())
  }).optional(),
  responseType: z.string(),
  responseStructure: z.record(z.any()),
  rateLimit: z.object({
    requests: z.number(),
    period: z.string()
  }).optional()
});

const ApiDataModelSchema = z.object({
  name: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
  }))
});

const ApiSummarySchema = z.object({
  baseUrl: z.string(),
  authMethods: z.array(z.string()),
  apiVersion: z.string(),
  endpoints: z.array(ApiEndpointSchema),
  pagination: z.object({
    type: z.string(),
    parameters: z.array(z.any())
  }),
  errorHandling: z.object({
    commonCodes: z.array(z.any()),
    structure: z.record(z.any())
  }),
  dataModels: z.array(ApiDataModelSchema),
  webhooks: z.object({
    supported: z.boolean(),
    events: z.array(z.string()),
    payload: z.record(z.any())
  }),
  specialNotes: z.array(z.string())
});


export class DriverValidatorAgent {
  constructor(private llm: LLM, private rag: RAG) {}

  async execute(input: {
    code: string;
    memconfig: string;
    apiSummary: any;  // Changed from string to any to handle both formats
  }): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      // Parse memconfig if it's a string, otherwise use as is
      const memconfigJson = typeof input.memconfig === 'string' 
        ? JSON.parse(input.memconfig) 
        : input.memconfig;

      // Use apiSummary as is - it should already be an object at this point
      const apiSummary = input.apiSummary;

      const memconfigResult = MemconfigSchema.safeParse(memconfigJson);
      
      if (!memconfigResult.success) {
        errors.push(...this.convertZodErrors(memconfigResult.error));
        return {
          isValid: false,
          errors,
          improvementPlan: await this.createImprovementPlan(errors)
        };
      }

      // Validate the schema against the API summary
      const apiValidationErrors = this.validateApiCoverage(
        memconfigResult.data,
        apiSummary
      );
      errors.push(...apiValidationErrors);

      // Validate code implementation
      const codeErrors = this.validateCodeImplementation(
        input.code,
        memconfigResult.data.schema.types
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
      console.error('Validation error:', error);
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

  private validateApiCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: z.infer<typeof ApiSummarySchema>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Validate Data Models Coverage
    this.validateDataModelsCoverage(memconfig, apiSummary, errors);

    // 2. Validate Endpoints Coverage
    this.validateEndpointsCoverage(memconfig, apiSummary, errors);

    // 3. Validate Webhook Support
    this.validateWebhooksCoverage(memconfig, apiSummary, errors);

    // 4. Validate Pagination Implementation
    this.validatePaginationCoverage(memconfig, apiSummary, errors);

    return errors;
  }

  private validateDataModelsCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: z.infer<typeof ApiSummarySchema>,
    errors: ValidationError[]
  ): void {
    const schemaTypes = memconfig.schema.types;
      
    for (const model of apiSummary.dataModels) {
      // First check for the resource type
      const resourceType = schemaTypes.find(type => 
        type.name === model.name
      );
  
      if (!resourceType) {
        errors.push({
          component: 'schema',
          message: `Missing schema type for data model: ${model.name}`,
          severity: 'error',
          suggestion: `Add a type definition for ${model.name} with its fields`
        });
        continue;
      }
  
      // Check if this type is referenced by any endpoints
      const isReferencedInEndpoints = apiSummary.endpoints.some(endpoint => {
        const responseRef = endpoint.responseStructure?.$ref;
        const requestRef = endpoint.requestBody?.properties?.$ref;
        return (responseRef?.includes(model.name) || requestRef?.includes(model.name));
      });
  
      // Only require collection types for models that are directly accessed via endpoints
      if (isReferencedInEndpoints) {
        const collectionType = schemaTypes.find(type => 
          type.name === `${model.name}Collection`
        );
  
        if (!collectionType) {
          errors.push({
            component: 'schema',
            message: `Missing collection type: ${model.name}Collection`,
            severity: 'error',
            suggestion: `Add a ${model.name}Collection type to manage ${model.name} resources`
          });
        }
      }
  
      // Check fields on the resource type
      for (const field of model.fields) {
        const hasField = resourceType.fields?.some(f => 
          f.name === field.name || 
          f.name === `get${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`
        );
  
        if (!hasField) {
          errors.push({
            component: 'schema',
            message: `Missing field "${field.name}" in type "${resourceType.name}"`,
            severity: 'warning',
            suggestion: `Add field "${field.name}" of type "${field.type}" to ${resourceType.name}`
          });
        }
      }
    }
  }

  private validateEndpointsCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: z.infer<typeof ApiSummarySchema>,
    errors: ValidationError[]
  ): void {
    const schemaTypes = memconfig.schema.types;
    
    for (const endpoint of apiSummary.endpoints) {
      let endpointCovered = false;

      // Check if endpoint is represented in schema actions
      for (const type of schemaTypes) {
        const matchingAction = type.actions?.find(action => {
          // Match based on path patterns and method
          const pathParts = endpoint.path.split('/').filter(Boolean);
          const actionNameParts = action.name.toLowerCase().split(/(?=[A-Z])/);
          
          return (
            actionNameParts.some(part => 
              pathParts.some(pathPart => pathPart.toLowerCase().includes(part.toLowerCase()))
            ) &&
            this.matchEndpointToAction(endpoint, action)
          );
        });

        if (matchingAction) {
          endpointCovered = true;
          
          // Validate parameters coverage
          this.validateEndpointParameters(endpoint, matchingAction, errors);
          break;
        }
      }

      if (!endpointCovered) {
        errors.push({
          component: 'schema',
          message: `Endpoint not covered: ${endpoint.method} ${endpoint.path}`,
          severity: 'error',
          suggestion: `Add an action to handle ${endpoint.method} ${endpoint.path}`
        });
      }
    }
  }

  private validateEndpointParameters(
    endpoint: z.infer<typeof ApiEndpointSchema>,
    action: z.infer<typeof SchemaMemberSchema>,
    errors: ValidationError[]
  ): void {
    const requiredParams = endpoint.parameters.filter(p => p.required);
    
    for (const param of requiredParams) {
      const hasParam = action.params?.some(p => 
        p.name === param.name || 
        p.name === this.convertParameterName(param.name)
      );

      if (!hasParam) {
        errors.push({
          component: 'schema',
          message: `Missing required parameter "${param.name}" in action "${action.name}"`,
          severity: 'error',
          suggestion: `Add parameter "${param.name}" to action "${action.name}"`
        });
      }
    }
  }

  private validateWebhooksCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: z.infer<typeof ApiSummarySchema>,
    errors: ValidationError[]
  ): void {
    if (apiSummary.webhooks.supported) {
      // Check if Root type has necessary webhook handling
      const rootType = memconfig.schema.types.find(t => t.name === "Root");
      
      if (!rootType?.actions?.some(a => a.name === "endpoint")) {
        errors.push({
          component: 'schema',
          message: "Missing webhook handler action 'endpoint' in Root type",
          severity: 'error',
          suggestion: "Add 'endpoint' action to Root type to handle incoming webhooks"
        });
      }

      // Check if webhook events are represented in schema
      for (const event of apiSummary.webhooks.events) {
        const eventName = this.convertWebhookEventName(event);
        const hasEvent = memconfig.schema.types.some(type =>
          type.events?.some(e => e.name === eventName)
        );

        if (!hasEvent) {
          errors.push({
            component: 'schema',
            message: `Missing event handler for webhook: ${event}`,
            severity: 'warning',
            suggestion: `Add event "${eventName}" to handle webhook ${event}`
          });
        }
      }
    }
  }

  private validatePaginationCoverage(
    memconfig: z.infer<typeof MemconfigSchema>,
    apiSummary: z.infer<typeof ApiSummarySchema>,
    errors: ValidationError[]
  ): void {
    if (apiSummary.pagination.type !== "none") {
      const collectionTypes = memconfig.schema.types.filter(t => 
        t.name.endsWith('Collection') || 
        (t.fields?.some(f => f.name === "items") && t.fields?.some(f => f.name === "next"))
      );

      if (collectionTypes.length === 0) {
        errors.push({
          component: 'schema',
          message: "Missing collection types for paginated responses",
          severity: 'error',
          suggestion: "Add collection types with 'items' and 'next' fields for paginated resources"
        });
      }

      for (const type of collectionTypes) {
        const hasNext = type.fields?.some(f => f.name === "next");
        const hasItems = type.fields?.some(f => f.name === "items");

        if (!hasNext || !hasItems) {
          errors.push({
            component: 'schema',
            message: `Incomplete pagination implementation in type "${type.name}"`,
            severity: 'error',
            suggestion: `Add ${!hasNext ? "'next'" : ""} ${!hasItems ? "'items'" : ""} field(s) to ${type.name}`
          });
        }
      }
    }
  }

  private matchEndpointToAction(
    endpoint: z.infer<typeof ApiEndpointSchema>,
    action: z.infer<typeof SchemaMemberSchema>
  ): boolean {
    // Extract the last part of the path for resource name
    const pathParts = endpoint.path.split('/').filter(Boolean);
    const resourceName = pathParts[0].toLowerCase(); // e.g., 'pet', 'store', 'user'
  
    // Extract path parameters
    const pathParams = endpoint.path.match(/\{([^}]+)\}/g)?.map(p => p.slice(1, -1)) || [];
  
    // Map HTTP methods to action name patterns
    const methodMappings: Record<string, string[]> = {
      'GET': ['get', 'list', 'find', 'read', 'fetch', 'one', 'inventory', 'login', 'logout'],
      'POST': ['create', 'add', 'insert', 'post', 'upload', 'update', 'createWithList'],
      'PUT': ['update', 'edit', 'modify', 'put'],
      'DELETE': ['delete', 'remove', 'destroy'],
      'PATCH': ['patch', 'modify', 'update']
    };
  
    const actionNameLower = action.name.toLowerCase();
    const expectedMethodWords = methodMappings[endpoint.method] || [];
  
    // Check if the action matches the method and has the required parameters
    const hasMatchingMethod = expectedMethodWords.some(word => actionNameLower.includes(word));
    const hasRequiredParams = pathParams.every(param => {
      const camelParam = this.convertParameterName(param);
      return action.params?.some(p => 
        p.name === param || 
        p.name === camelParam || 
        p.name.includes(camelParam)
      );
    });
  
    return hasMatchingMethod && hasRequiredParams;
  }

  private convertParameterName(name: string): string {
    return name.replace(/[-_.]([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private convertWebhookEventName(event: string): string {
    return event.toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, chr => chr.toLowerCase());
  }

  private validateCodeImplementation(
    code: string,
    schemaTypes: z.infer<typeof SchemaTypeSchema>[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const type of schemaTypes) {
      // Skip validation for types that are implemented via spread
      if (this.isTypeImplementedViaSpread(code, type.name)) {
        continue;
      }

      // Check type export
      const typeRegex = new RegExp(`export\\s+const\\s+${type.name}\\s*=\\s*{([^}]+)}`, 's');
      const typeMatch = code.match(typeRegex);
      
      if (!typeMatch) {
        errors.push({
          component: 'code',
          message: `Missing implementation for schema type: ${type.name}`,
          severity: 'error',
          suggestion: `Add export const ${type.name} = { ... }`
        });
        continue;
      }

      const typeImplementation = typeMatch[1];

      // Validate fields based on type category
      if (this.isCollectionType(type.name)) {
        // Collection types only need minimal implementation
        type.fields?.forEach(field => {
          if (!this.hasValidCollectionField(typeImplementation, field.name)) {
            errors.push({
              component: 'code',
              message: `Missing field implementation: ${field.name} in ${type.name}`,
              severity: 'error',
              suggestion: this.generateFieldSuggestion(field, type)
            });
          }
        });
      } else if (this.isResourceType(type)) {
        // Resource types can be implemented via spread
        if (!this.hasSpreadImplementation(code, type.name)) {
          type.fields?.forEach(field => {
            if (!this.hasFieldImplementation(typeImplementation, field.name)) {
              errors.push({
                component: 'code',
                message: `Missing field implementation: ${field.name} in ${type.name}`,
                severity: 'error',
                suggestion: this.generateFieldSuggestion(field, type)
              });
            }
          });
        }
      }

      // Validate actions
      type.actions?.forEach(action => {
        if (!this.hasValidActionImplementation(typeImplementation, action)) {
          errors.push({
            component: 'code',
            message: `Missing or invalid action implementation: ${action.name} in ${type.name}`,
            severity: 'error',
            suggestion: this.generateActionSuggestion(action)
          });
        }
      });
    }

    return errors;
  }

  private isTypeImplementedViaSpread(code: string, typeName: string): boolean {
    const patterns = [
      // Collection return spread
      `return\\s*{\\s*\\.\\.\\.data\\s*,\\s*\\.\\.\\.${typeName}\\s*}`,
      // Resource definition spread
      `const\\s+${typeName}\\s*=\\s*{\\s*\\.\\.\\.data\\s*}`,
      // Any spread usage of the type
      `\\.\\.\\.${typeName}`
    ];
    
    const combinedPattern = new RegExp(patterns.join('|'));
    return combinedPattern.test(code);
  }

  private hasValidCollectionField(implementation: string, fieldName: string): boolean {
    // Clean the implementation string to handle whitespace better
    const cleanImpl = implementation.replace(/\s+/g, ' ').trim();
    
    const patterns = [
      // Arrow function returning empty object
      `${fieldName}\\s*:\\s*\\(\\s*\\)\\s*=>\\s*\\(?\\s*\\{`,
      // Arrow function returning object
      `${fieldName}\\s*:\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
      // Async arrow function or method
      `${fieldName}\\s*:\\s*async\\s*(?:function\\s*)?\\(`,
      // Simple property assignment
      `${fieldName}\\s*:\\s*\\{`,
      // Direct method definition
      `${fieldName}\\s*\\(.*\\)\\s*\\{`,
      // Function assignment
      `${fieldName}\\s*:\\s*function\\s*\\(`,
      // Object property
      `${fieldName}\\s*:[^{]*$`,
      // Method with type annotation (TypeScript)
      `${fieldName}\\s*:\\s*(?:[\\w<>\\[\\],\\s]+)\\s*=>`
    ];
  
    const combinedPattern = new RegExp(patterns.join('|'), 'm');
    return combinedPattern.test(cleanImpl);
  }

  private isCollectionType(typeName: string): boolean {
    return typeName.endsWith('Collection') || typeName === 'Root';
  }

  private isResourceType(type: z.infer<typeof SchemaTypeSchema>): boolean {
    return !this.isCollectionType(type.name) && !!type.fields?.length;
  }

  private hasSpreadImplementation(code: string, typeName: string): boolean {
    const patterns = [
      // Direct spread in return
      `return\\s*{[^}]*\\.\\.\\.${typeName}[^}]*}`,
      // Spread with data
      `return\\s*{[^}]*\\.\\.\\.data[^}]*\\.\\.\\.${typeName}[^}]*}`,
      // Assignment with spread
      `=\\s*{[^}]*\\.\\.\\.${typeName}[^}]*}`,
      // Spread in object literal
      `{\\s*\\.\\.\\.${typeName}\\s*}`,
      // Spread with other properties
      `{[^}]*\\.\\.\\.${typeName}[^}]*}`
    ];

    const combinedPattern = new RegExp(patterns.join('|'));
    return combinedPattern.test(code);
  }

  private hasFieldImplementation(implementation: string, fieldName: string): boolean {
    const patterns = [
      // Direct field definition
      `${fieldName}\\s*:`,
      // Getter method
      `get\\s+${fieldName}\\s*\\(`,
      // Method implementation
      `${fieldName}\\s*\\([^)]*\\)\\s*{`,
      // Arrow function
      `${fieldName}\\s*:\\s*\\([^)]*\\)\\s*=>`,
      // Object property
      `${fieldName}\\s*:\\s*{`,
      // Value assignment
      `${fieldName}\\s*=`
    ];

    const combinedPattern = new RegExp(patterns.join('|'));
    return combinedPattern.test(implementation);
  }

  private hasValidActionImplementation(implementation: string, action: z.infer<typeof SchemaMemberSchema>): boolean {
    const asyncPatterns = [
      // Async function
      `${action.name}\\s*:\\s*async\\s+function\\s*\\(`,
      // Async arrow function
      `${action.name}\\s*:\\s*async\\s*\\([^)]*\\)\\s*=>`,
      // Async method
      `${action.name}\\s*:\\s*async\\s+\\w+\\s*\\(`
    ];

    // Check if action exists and is async
    const asyncPattern = new RegExp(asyncPatterns.join('|'));
    if (!asyncPattern.test(implementation)) {
      return false;
    }

    // If action has parameters, check they're properly implemented
    if (action.params && action.params.length > 0) {
      const paramNames = action.params
        .filter(p => !p.optional)
        .map(p => p.name);

      if (paramNames.length > 0) {
        // More flexible parameter matching
        const paramPattern = new RegExp(
          `${action.name}\\s*:\\s*async\\s*(?:function\\s*)?\\([^)]*\\{[^}]*(?:${paramNames.join('|')})`
        );

        if (!paramPattern.test(implementation)) {
          return false;
        }
      }
    }

    return true;
  }

  private generateFieldSuggestion(
    field: z.infer<typeof SchemaMemberSchema>,
    type: z.infer<typeof SchemaTypeSchema>
  ): string {
    if (!type.name.endsWith('Collection')) {
      return `${field.name}: {
    // Field implementation
  },`;
    }

    if (field.params) {
      const params = field.params.map(p => p.name).join(', ');
      return `async ${field.name}({ ${params} }) {
    // Implementation
    return null;
  },`;
    }

    return `${field.name}: () => ({
    // Implementation
  }),`;
  }

  private generateActionSuggestion(action: z.infer<typeof SchemaMemberSchema>): string {
    const params = action.params?.map(p => p.name).join(', ') || '';
    return `async ${action.name}({ ${params} }) {
    // Implementation
  },`;
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

  private async createImprovementPlan(errors: ValidationError[]): Promise<ValidationImprovementPlan> {
    const errorsByComponent = errors.reduce((acc, error) => {
      if (!acc[error.component]) {
        acc[error.component] = [];
      }
      acc[error.component].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

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