/**
* Driver Validator Agent for Membrane Drivers
* Validates generated driver schema against API specifications, checking endpoint coverage,
* data models, and collections. Provides detailed validation errors and 
* improvement suggestions to be passed on to improvement agents.
*/
import { LLM } from "./llm";
import { RAG } from "./rag";
import * as z from "zod";
import { ValidationError, ValidationResult, ValidationImprovementPlan } from "./types";

// Schema validation
const MemconfigSchema = z.object({
  schema: z.object({
    types: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
        params: z.array(z.object({
          name: z.string(),
          type: z.string(),
          optional: z.boolean().optional()
        })).optional()
      })).optional(),
      actions: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
        params: z.array(z.object({
          name: z.string(),
          type: z.string(),
          optional: z.boolean().optional()
        })).optional()
      })).optional(),
      events: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional()
      })).optional()
    }))
  }).refine(schema => schema.types.some(type => type.name === "Root"), {
    message: "Schema must include a Root type"
  })
});

export class DriverValidatorAgent {
  private llm: LLM;
  private rag: RAG;

  constructor(llm: LLM, rag: RAG) {
    this.llm = llm;
    this.rag = rag;
  }

  async execute(input: {
    memconfig: string | object;
    apiSummary: any;
  }): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    try {
      const memconfigJson = typeof input.memconfig === 'string' 
        ? JSON.parse(input.memconfig) 
        : input.memconfig;
      
      const memconfigResult = MemconfigSchema.safeParse(memconfigJson);
      if (!memconfigResult.success) {
        errors.push(...this.convertZodErrors(memconfigResult.error));
        return this.buildValidationResult(errors);
      }

      // console.log(input.apiSummary);

      const schemaValidation = await this.validateSchemaAgainstApi(
        memconfigResult.data,
        input.apiSummary
      );
      
      if (schemaValidation.errors.length > 0) {
        errors.push(...schemaValidation.errors);
      }

      if (errors.length > 0) {
        return this.buildValidationResult(errors);
      }

      return {
        isValid: true,
        errors: []
      };

    } catch (error) {
      console.error('Validation error:', error);
      errors.push({
        component: 'schema',
        message: `Schema validation error: ${error.message}`,
        severity: 'error'
      });
      return this.buildValidationResult(errors);
    }
  }

/**
* API Summary vs Memconfig Validation Process
* 
* validateSchemaAgainstApi performs two key validations:
* 1. Data Model Validation:
*    - Checks that all API data models exist as Types in memconfig
*    - Verifies all fields from API models exist in corresponding Types
* 
* 2. Endpoint Coverage Validation:
*    - Maps API paths to collection hierarchies (e.g. store/order maps to StoreCollection with OrderCollection)
*    - For each endpoint:
*      - GET with ID -> needs 'one' field
*      - GET without ID -> implicitly handled by collection
*      - POST with ID -> needs matching action or update/form handlers
*      - POST without ID -> needs 'create' action
*      - PUT -> needs 'update' action
*      - DELETE -> needs 'delete' action
*    - Checks both direct and nested collections for handlers
*/

  private async validateSchemaAgainstApi(memconfig: z.infer<typeof MemconfigSchema>, apiSummary: any) {
    const errors: ValidationError[] = [];

    // Helper to normalize collection names
    const normalizeCollectionName = (name: string): string => {
      return name.toLowerCase().replace(/collection$/, '');
    };

    // Build a map of resource paths to their collections
    const resourceMap = new Map<string, any>();
    
    // Helper to find collection and its nested collections
    const mapCollectionHierarchy = (type: any, parentPath: string = '') => {
      if (type.name.endsWith('Collection')) {
        const normalizedName = normalizeCollectionName(type.name);
        const path = parentPath ? `${parentPath}/${normalizedName}` : normalizedName;
        resourceMap.set(path, type);

        // Map fields that point to other collections
        type.fields?.forEach((field: any) => {
          if (field.type.endsWith('Collection')) {
            const nestedType = memconfig.schema.types.find(t => t.name === field.type);
            if (nestedType) {
              mapCollectionHierarchy(nestedType, path);
            }
          }
        });
      }
    };

    // Build resource map from all types
    memconfig.schema.types.forEach(type => mapCollectionHierarchy(type));

    // 1. Validate Data Models exist as Types
    for (const model of apiSummary.dataModels) {
      const modelType = memconfig.schema.types.find(t => t.name === model.name);
      if (!modelType) {
        errors.push({
          component: 'schema',
          message: `Missing type for data model: ${model.name}`,
          severity: 'error',
          suggestion: this.generateTypeDefinitionSuggestion(model)
        });
        continue;
      }

      // Check all model fields exist in type
      for (const field of model.fields) {
        const hasField = modelType.fields?.some(f => f.name === field.name);
        if (!hasField) {
          errors.push({
            component: 'schema',
            message: `Missing field in type ${modelType.name}: ${field.name}`,
            severity: 'error',
            suggestion: this.generateFieldSuggestion(field, modelType.name)
          });
        }
      }
    }

    // 2. Check API endpoint coverage
    for (const endpoint of apiSummary.endpoints) {
      const { resourcePath, actionName } = this.parseEndpoint(endpoint);
      
      // Try to find handlers for this endpoint in the collection hierarchy
      let handlerFound = false;
      let collectionChecked: any = null;

      // Check each level of the resource path
      for (let i = 0; i <= resourcePath.length; i++) {
        const pathToCheck = resourcePath.slice(0, i).join('/');
        const collection = resourceMap.get(pathToCheck);
        
        if (collection) {
          collectionChecked = collection;
          if (this.isEndpointCovered(endpoint, collection)) {
            handlerFound = true;
            break;
          }
        }
      }

      if (!handlerFound && collectionChecked) {
        errors.push({
          component: 'schema',
          message: `Missing handler for endpoint: ${endpoint.method} ${endpoint.path}`,
          severity: 'error',
          suggestion: this.generateEndpointSuggestion(endpoint, collectionChecked.name)
        });
      }
    }

    return { errors };
  }

  private parseEndpoint(endpoint: any) {
    const parts = endpoint.path.split('/').filter(Boolean);
    const resourcePath: string[] = [];
    let currentPart = '';
    
    // Build the resource path handling parameterized parts
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part.startsWith('{')) {
        currentPart = this.normalizeCollectionName(part);
        resourcePath.push(currentPart);
      }
    }

    // Get action name from last non-parameter part or last part without {}
    const actionName = parts[parts.length - 1].replace(/[{}]/g, '');

    return { resourcePath, actionName };
  }

  private normalizeCollectionName(name: string): string {
    return name.toLowerCase();
  }

  private isEndpointCovered(endpoint: any, collectionType: any): boolean {
    const { actionName } = this.parseEndpoint(endpoint);
    const method = endpoint.method.toLowerCase();
    const hasId = endpoint.path.includes('{');
    
    // Helper to check for action existence
    const hasAction = (name: string): boolean => {
      return collectionType.actions?.some(a => 
        a.name.toLowerCase() === name.toLowerCase()
      );
    };

    // Helper to check for field existence
    const hasField = (name: string): boolean => {
      return collectionType.fields?.some(f => 
        f.name.toLowerCase() === name.toLowerCase()
      );
    };

    switch (method) {
      case 'get':
        if (hasId) {
          return hasField('one');
        }
        return true; // Collection GET is implicitly handled

      case 'post':
        if (hasId) {
          // Check for both custom action name and update-style actions
          return hasAction(actionName) || 
                 hasAction('update') || 
                 hasAction('updateWithFormData');
        }
        return hasAction('create');

      case 'put':
        return hasAction('update');

      case 'delete':
        return hasAction('delete');

      default:
        return hasAction(actionName);
    }
  }

  private generateTypeDefinitionSuggestion(model: any): string {
    const fields = model.fields.map(f => 
      `    ${f.name}: ${this.convertTypeToMembrane(f.type)}${f.description ? ` // ${f.description}` : ''}`
    ).join('\n');

    return `Add type definition:
{
  "name": "${model.name}",
  "fields": [
${fields}
  ]
}`;
  }

  private generateFieldSuggestion(field: any, typeName: string): string {
    return `Add field to ${typeName}:
{
  "name": "${field.name}",
  "type": "${this.convertTypeToMembrane(field.type)}",
  "description": "${field.description || ''}"
}`;
  }

  private generateEndpointSuggestion(endpoint: any, collectionName: string): string {
    const { actionName } = this.parseEndpoint(endpoint);
    const method = endpoint.method.toLowerCase();
    const hasId = endpoint.path.includes('{');

    switch (method) {
      case 'get':
        if (hasId) {
          return `Add "one" field to ${collectionName}`;
        }
        return `Collection GET is handled automatically`;
      
      case 'post':
        if (hasId) {
          return `Add "${actionName}" action to ${collectionName} (or use update/updateWithFormData)`;
        }
        return `Add "create" action to ${collectionName}`;
      
      case 'put':
        return `Add "update" action to ${collectionName}`;
      
      case 'delete':
        return `Add "delete" action to ${collectionName}`;
      
      default:
        return `Add "${actionName}" action to ${collectionName}`;
    }
  }

  private convertTypeToMembrane(type: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'Int',
      'string': 'String',
      'boolean': 'Boolean',
      'number': 'Float',
      'array': 'List',
      'object': 'Json'
    };
    return typeMap[type.toLowerCase()] || 'String';
  }

  private convertZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.errors.map(err => ({
      component: 'schema',
      message: err.message,
      path: err.path.map(String),
      severity: 'error'
    }));
  }

  private async buildValidationResult(errors: ValidationError[]): Promise<ValidationResult> {
    const improvementPlan = await this.createImprovementPlan(errors);
    return {
      isValid: errors.length === 0,
      errors,
      improvementPlan
    };
  }

  private async createImprovementPlan(errors: ValidationError[]): Promise<ValidationImprovementPlan> {
    const schemaErrors = errors.filter(e => e.component === 'schema');
    
    if (schemaErrors.length === 0) {
      return {
        components: [],
        suggestions: [],
        prompt: ''
      };
    }

    const formattedSuggestions = schemaErrors.map(error => 
      `${error.severity.toUpperCase()}: ${error.message}\n${error.suggestion || ''}`
    ).join('\n\n');

    return {
      components: ['schema'],
      suggestions: [`SCHEMA Improvements:\n${formattedSuggestions}`],
      prompt: `Please update the schema with these changes:\n\n${formattedSuggestions}`
    };
  }
}