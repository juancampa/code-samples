export interface DriverFiles {
  'index.ts': string;
  'memconfig.json': string;
  'README.md': string;
  'package.json': string;
}

export interface DriverCheckpoint {
  id: number;
  timestamp: number;
  message: string;
  files: DriverFiles;
  isValid: boolean;
  validationErrors?: ValidationError[];
  improvementPlan?: ValidationImprovementPlan;
}

export interface DriverData {
  id: string;
  name: string;
  apiSpec: string;
  analyzedApi: any;
  isValid: boolean;
  validationErrors?: ValidationError[];
  improvementPlan?: ValidationImprovementPlan;
  files: DriverFiles;
  checkpoints: {
    [id: number]: DriverCheckpoint;
  };
  currentCheckpoint: number;
}

export interface DriverContext {
  id: string;
  name: string;
  apiSpec: string;
  analyzedApi: string;
  driver: DriverFiles;
  isValid: boolean;
}

export interface ValidationError {
  component: "schema" | "code";
  message: string;
  path?: string[];
  suggestion?: string;
  severity: "error" | "warning";
}

export interface ValidationImprovementPlan {
  components: ("schema" | "code")[];
  suggestions: string[];
  prompt: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  improvementPlan?: ValidationImprovementPlan;
}

export interface DriverGenerationResult extends DriverData {}

export interface CheckpointData extends DriverGenerationResult {
  timestamp: number;
  description: string;
}

export interface VectorEntry {
  id: string;
  vector: number[];
  vectorMag: number;
  metadata: {
    content: string;
    title: string;
    identifier: string;
    relatedContent?: string;
  };
}

export interface EmbeddingData {
  object: string;
  embedding: number[];
  index: number;
}

export type ImprovementComponent = 'all' | 'code' | 'schema' | 'docs' | 'package';

// Helper type for component file mapping
export const fileForComponent: Record<ImprovementComponent, keyof DriverFiles | null> = {
  'all': null,
  'code': 'index.ts',
  'schema': 'memconfig.json',
  'docs': 'README.md',
  'package': 'package.json'
};