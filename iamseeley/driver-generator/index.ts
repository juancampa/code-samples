
/**
* Membrane Driver Generator Program
* Main entry point that exports Root, Driver, and ImprovementAgents for managing API driver
* generation, validation, and improvement. Handles program state, driver files, and filesystem
* operations.
*  Key Questions / Thoughts:
* - What's the best overall strategy for improving a generated driver?
* - How do we identify which parts of a driver actually need improvement?
* - When should we regenerate vs incrementally improve driver components?
* - How to handle partial improvements without breaking existing functionality?
*/

import { nodes, state } from "membrane";
import { RAG } from "./rag";
import { LLM } from "./llm";
import { processDriverExamples } from "./processExamples";
import { DriverData, DriverFiles } from "./types";
import { PipelineManager } from "./PipelineManager";

// Initialize state
state.drivers = (state.drivers ?? {}) as Record<string, DriverData>; // Changed from array to record
state.nextId = state.nextId ?? 1;

const rag = new RAG();
const llm = new LLM();
const pipelineManager = new PipelineManager(llm, rag);

export const Root = {
  status: () => {
    return `Ready with ${Object.keys(state.drivers).length} drivers`;
  },
  driver: () => ({}),
  context: () => ({}),
  setAuthToken: ({ memtoken }: {memtoken: string}) => {
    state.memtoken = memtoken ?? state.memtoken;
    console.log("Auth token set successfully");
    return "Auth token set successfully";
  }, 
};

export const Driver = {
  generateDriver: async ({ apiSpec, name }) => {
    // Check if driver already exists
    if (name in state.drivers) {
      throw new Error(`A driver with the name "${name}" already exists. Please use a different name.`);
    }
    
    const driver = await pipelineManager.generateDriver(apiSpec, name);
    state.drivers[name] = driver;
  
    if (!driver.isValid) {
      console.warn(`Driver (${name}) failed validation but was still saved.`);
    }
  
    return Driver.driverData({ name });
  },
  
  improve: () => ({}),

  driverData: ({ name }: { name: string }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }
  
    // Log first level fields
    const summary = {
      name: driver.name,
      isValid: driver.isValid,
      hasAnalyzedApi: !!driver.analyzedApi,
      hasValidationErrors: !!driver.validationErrors,
      hasImprovementPlan: !!driver.improvementPlan,
      numberOfCheckpoints: Object.keys(driver.checkpoints || {}).length,
      currentCheckpoint: driver.currentCheckpoint,
      files: Object.keys(driver.files)
    };
    
    console.log("Driver Summary:", summary);
    
    return driver;
  },

  getCheckpoints: ({ name }: { name: string }) => {
    return pipelineManager.getDriverCheckpoints(name);
  },

  rollbackToCheckpoint: async ({ name, checkpointId }: { name: string, checkpointId: number }) => {
    await pipelineManager.rollbackDriver(name, checkpointId);
    return Driver.driverData({ name });
  },

  saveDriver: async ({ name }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }

    await checkAndCreateDriverDirectory(name);

    try {
      // Save all files from the driver.files object
      await Promise.all(
        (Object.entries(driver.files) as [keyof DriverFiles, string][])
          .map(([filename, content]) => 
            saveFile(`${name}/${filename}`, content)
          )
      );

      console.log(`Driver ${name} saved successfully`);
      return true;
    } catch (error) {
      console.error(`Error saving driver ${name}:`, error);
      return false;
    }
  },

  clearDriverData: () => {
    state.drivers = {};
    state.nextId = 1;
    console.log("All driver data has been cleared.");
    return "Driver data cleared successfully";
  },

  deleteDriver: ({ name }: { name: string }): boolean => {
    if (!state.drivers[name]) {
      console.warn(`Driver with id ${name} not found.`);
      return false;
    }
    
    delete state.drivers[name];
    pipelineManager.deleteDriver(name);
    console.log(`Driver ${name} deleted successfully.`);
    return true;
  },

  validate: async ({ name }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }

    const validation = await pipelineManager.validateDriver(name);
    
    // Update driver with validation results, but keep the rest of the driver data
    state.drivers[name] = {
      ...driver,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      improvementPlan: validation.improvementPlan
    };

    return validation;
  },
  
};

export const ImprovementAgents = {
  validateAndImprove: async ({ name }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }

    const improvedDriver = await pipelineManager.validateAndImprove(name);
    if (!improvedDriver) {
      throw new Error(`Improvement failed for driver ${name}`);
    }

    // Update the state with the improved driver
    state.drivers[name] = improvedDriver;

    // Return the driver data representation
    return Driver.driverData({ name });
  },
  
  improveCode: async ({ name, feedback }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }
    
    await pipelineManager.improveSpecificPart(name, feedback, "code");
    return Driver.driverData({ name });
  },
  
  improveSchema: async ({ name, feedback }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }
    
    await pipelineManager.improveSpecificPart(name, feedback, "schema");
    return Driver.driverData({ name });
  },
  
  improveDocs: async ({ name, feedback }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }
    
    await pipelineManager.improveSpecificPart(name, feedback, "docs");
    return Driver.driverData({ name });
  },
  
  improvePackageJson: async ({ name, feedback }) => {
    const driver = state.drivers[name];
    if (!driver) {
      throw new Error(`Driver ${name} not found`);
    }
    
    await pipelineManager.improveSpecificPart(name, feedback, "package");
    return Driver.driverData({ name });
  },
};

export const Context = {
  clearAllData: () => {
    state.context = {};
    state.drivers = {};
    state.nextId = 1;
    console.log("All context and driver data have been cleared.");
    return "All data cleared successfully";
  },

  clearContextData: () => {
    state.context = {};
    console.log("All context data has been cleared.");
    return "Context data cleared successfully";
  },

}


// async function loadDriverContexts() {
//   try {
//     console.log("Starting to load driver contexts...");

//     // Fetch and index driver examples
//     await processDriverExamples(rag);

//     // Fetch and index Membrane documentation
//     await fetchAndIndexMembraneDocumentation();

    

//     console.log("All contexts loaded and indexed successfully");
//   } catch (error) {
//     console.error("Error loading driver contexts:", error);
//   }
// }

// async function fetchAndIndexMembraneDocumentation() {
//   console.log("Fetching Membrane documentation...");
//   const owner = "iamseeley";
//   const repo = "mem-knowledge";
//   const path = "membrane_docs";

//   try {
//     await processDirectory(owner, repo, path, "membrane_docs");
//   } catch (error) {
//     console.error("Error fetching Membrane documentation:", error);
//   }
// }

// async function fetchAndIndexDriverExamples() {
//   console.log("Fetching driver examples...");
//   const owner = "iamseeley";
//   const repo = "mem-knowledge";
//   const path = "driver_examples/testing";

//   try {
//     await processDirectory(owner, repo, path, "driver_examples");
//   } catch (error) {
//     console.error("Error fetching driver examples:", error);
//   }
// }

// async function processDirectory(owner: string, repo: string, path: string, indexNamespace: string) {
//   const dirContent = await nodes.github.users
//     .one({ name: owner })
//     .repos.one({ name: repo })
//     .content.dir({ path })
//     .$query(`{ name type path }`);

//     if (Array.isArray(dirContent)) {
//       for (const entry of dirContent) {
//         if (!entry.path) {
//           console.warn(`Skipping entry with undefined path in ${path}`);
//           continue;
//         }
  
//         if (entry.type === "dir") {
//           await processDirectory(owner, repo, entry.path, indexNamespace);
//         } else if (entry.type === "file") {
//           await processFile(owner, repo, entry.path, indexNamespace);
//         }
//       }
//     } else {
//       console.warn(`Unexpected directory content structure for ${path}`);
//     }
//   }

// async function processFile(owner: string, repo: string, path: string, indexNamespace: string) {
//   const fileContent = await nodes.github.users
//     .one({ name: owner })
//     .repos.one({ name: repo })
//     .content.file({ path })
//     .$query(`{ content }`);

//   if (fileContent && fileContent.content) {
//     const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
//     const fileExtension = path.split('.').pop()?.toLowerCase() || '';

//     if (['md', 'mdx'].includes(fileExtension)) {
//       // Process Markdown/MDX files
//       const title = extractTitleFromMarkdown(decodedContent) || path.split('/').pop() || path;
//       await rag.addToIndex(indexNamespace, path, {
//         title,
//         content: decodedContent
//       });
//     } else if (['ts', 'js', 'json'].includes(fileExtension)) {
//       // Process code files
//       await rag.addToIndex(indexNamespace, path, {
//         title: `Code: ${path.split('/').pop() || path}`,
//         content: decodedContent
//       });
//     }

//     console.log(`Indexed file: ${path}`);
//   } else {
//     console.warn(`No content found for file: ${path}`);
//   }
// }

// function extractTitleFromMarkdown(content: string): string | null {
//   const titleMatch = content.match(/^#\s+(.+)$/m);
//   return titleMatch ? titleMatch[1].trim() : null;
// }



async function checkDirectoryExists(name: string): Promise<boolean> {
  if (!state.memtoken) {
    throw new Error("Auth token not set. Please call setAuthToken first with your Membrane token.");
  }

  try {
    // Step 1: Send GET request to check directory existence
    const response = await fetch(`http://api.membrane.io/fs/stat?path=/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.memtoken}`
      },
    });

    return response.status === 200; // Directory exists if status is 200
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // Directory does not exist
    }
    throw error;
  }
}

async function createDirectory(name: string) {
  if (!state.memtoken) {
    throw new Error("Auth token not set. Please call setAuthToken first with your Membrane token.");
  }

  try {
    // Send the PUT request to create a directory
    const response = await fetch(`http://api.membrane.io/fs/dir?path=/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.memtoken}`
      }
    });

    if (response.ok) {
      console.log(`Directory ${name} created successfully`);
    } else {
      throw new Error(`Failed to create directory: ${response.status}`);
    }
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
}


async function saveFile(path: string, content: string) {
  if (!state.memtoken) {
    throw new Error("Auth token not set. Please call setAuthToken first with your Membrane token.");
  }

  try {
    // Split the path by '/' and encode only the parts (not the slashes)
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');

    // Convert the content to base64
    const base64Content = Buffer.from(content).toString('base64'); // Ensure it's base64-encoded

    const response = await fetch(`http://api.membrane.io/fs/file?path=/${encodedPath}&overwrite=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain', // Keep this as plain text since we're sending raw data
        'Authorization': `Bearer ${state.memtoken}`,
      },
      body: base64Content, // Sending only the base64-encoded content as the body
    });

    if (!response.ok) {
      console.error(`Failed to save file ${path}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`Error saving file ${path}:`, error);
    throw error;
  }
}


async function checkAndCreateDriverDirectory(name: string) {
  const dirExists = await checkDirectoryExists(name);
  if (!dirExists) {
    await createDirectory(name);
  }
}

