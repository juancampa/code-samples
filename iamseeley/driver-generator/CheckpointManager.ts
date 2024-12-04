/**
* Checkpoint Manager for Driver Generation
* Manages version control and state restoration for drivers throughout the generation process. 
* Creates, tracks, and enables rollback to previous driver states with their associated 
* validation results.
*/
import { DriverData, DriverCheckpoint, ValidationResult } from "./types";
import { state } from "membrane";

export class CheckpointManager {
  private checkpoints: { [driverName: string]: { [id: number]: DriverCheckpoint } } = {};
  private currentCheckpoints: { [driverName: string]: number } = {};

  createCheckpoint(
    driver: DriverData,
    message: string,
    validationResult?: ValidationResult
  ): DriverCheckpoint {
    if (!this.checkpoints[driver.name]) {
      this.checkpoints[driver.name] = {};
    }
  
    const nextId = Object.keys(this.checkpoints[driver.name]).length;
    const checkpoint: DriverCheckpoint = {
      id: nextId,
      timestamp: Date.now(),
      message,
      files: { ...driver.files },
      isValid: validationResult?.isValid ?? driver.isValid,
      validationErrors: validationResult?.errors ? [...validationResult.errors] : driver.validationErrors ? [...driver.validationErrors] : undefined,
      improvementPlan: validationResult?.improvementPlan ? {
        components: [...validationResult.improvementPlan.components],
        suggestions: [...validationResult.improvementPlan.suggestions],
        prompt: validationResult.improvementPlan.prompt
      } : driver.improvementPlan ? {
        components: [...driver.improvementPlan.components],
        suggestions: [...driver.improvementPlan.suggestions],
        prompt: driver.improvementPlan.prompt
      } : undefined
    };
  
    // Save to both checkpoint manager and driver state
    this.checkpoints[driver.name][nextId] = checkpoint;
    driver.checkpoints[nextId] = checkpoint;
    driver.currentCheckpoint = nextId;
    
    this.currentCheckpoints[driver.name] = nextId;
    return checkpoint;
  }

  getCheckpoint(driverName: string, checkpointId: number): DriverCheckpoint | null {
    return this.checkpoints[driverName]?.[checkpointId] ?? null;
  }

  getCurrentCheckpoint(driverName: string): DriverCheckpoint | null {
    const currentId = this.currentCheckpoints[driverName];
    return currentId !== undefined ? this.getCheckpoint(driverName, currentId) : null;
  }

  rollbackToCheckpoint(driver: DriverData, checkpointId: number): void {
    const checkpoint = this.getCheckpoint(driver.name, checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
  
    // Update driver files state
    driver.files = { ...checkpoint.files };
    driver.isValid = checkpoint.isValid;
    driver.validationErrors = checkpoint.validationErrors ? [...checkpoint.validationErrors] : undefined;
    driver.improvementPlan = checkpoint.improvementPlan ? {
      components: [...checkpoint.improvementPlan.components],
      suggestions: [...checkpoint.improvementPlan.suggestions],
      prompt: checkpoint.improvementPlan.prompt
    } : undefined;
    driver.currentCheckpoint = checkpointId;
    
    this.currentCheckpoints[driver.name] = checkpointId;
  }

  rollbackToLastValidCheckpoint(driver: DriverData): boolean {
    const driverCheckpoints = this.checkpoints[driver.name];
    if (!driverCheckpoints) return false;

    const validCheckpoints = Object.values(driverCheckpoints)
      .filter(cp => cp.isValid)
      .sort((a, b) => b.id - a.id);

    if (validCheckpoints.length > 0) {
      this.rollbackToCheckpoint(driver, validCheckpoints[0].id);
      return true;
    }

    return false;
  }

  getAllCheckpoints(driverName: string): DriverCheckpoint[] {
    const checkpoints = this.checkpoints[driverName];
    if (!checkpoints) return [];
    return Object.values(checkpoints).sort((a, b) => a.id - b.id);
  }

  getLatestCheckpoint(driverName: string): DriverCheckpoint | null {
    const checkpoints = this.checkpoints[driverName];
    if (!checkpoints) return null;
    return Object.values(checkpoints)
      .sort((a, b) => b.id - a.id)[0] ?? null;
  }

  clear(driverName: string): void {
    delete this.checkpoints[driverName];
    delete this.currentCheckpoints[driverName];
    
    const driver = state.drivers[driverName];
    if (driver) {
      driver.checkpoints = {};
      driver.currentCheckpoint = -1;
    }
  }
}