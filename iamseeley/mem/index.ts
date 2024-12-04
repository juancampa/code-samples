import { root, state } from "membrane";

// Driver for the Membrane API

export const Root = {
  // Returns the current status of the API connection
  status: () => state.token ? "Ready" : "Please add your Membrane API token",
  
  // Configures the API with the provided token
  // Throws an error if no token is provided
  configure: async ({ token }) => {
    if (!token) {
      throw new Error("Please provide a valid Membrane API token");
    }
    state.token = token;
    return "Configuration completed successfully.";
  },

  // Placeholder methods for accessing different collections
  programs: () => ({}),
  files: () => ({}),
  packages: () => ({}),
  tests: () => ({}),

  // Executes an action on a specified graph reference (gref)
  // Uses the POST method to send the action request
  action: async ({ gref }) => {
    return await api("POST", "action", undefined, { gref });
  },

  // Performs a query on a specified graph reference (gref)
  // Uses the POST method to send the query request
  query: async ({ gref, query }) => {
    return await api("POST", "query", undefined, { gref, query });
  },  
};

export const ProgramCollection = {
  // Retrieves details of a single program by its name
  // Combines the API response with the Program object
  one: async ({ pname }) => {
    const data = await api("GET", `program_details/${pname}`);
    return { ...data, ...Program, pname };
  },

  // Retrieves a page of programs with optional include parameters
  // Returns an object with items (programs) and a next page indicator
  page: async ({ 
    include_schemas = false, 
    include_expressions = true,
    include_version_hash = false 
  } = {}) => {
    const data = await api("GET", "ps", { 
      include_schemas, 
      include_expressions, 
      include_version_hash 
    });
  
    if (!data || !Array.isArray(data.programs)) {
      console.error("Unexpected API response format:", data);
      return { items: [], next: null };
    }
  
    return {
      items: data.programs.map(prog => ({ 
        ...prog, 
        pname: prog.name || prog.pname || "Unknown" 
      })),
      next: null
    };
  },

  // Creates a new program with the given name and options
  // Returns a reference to the newly created program
  create: async ({ 
    pname,
    isSystem = false, 
    noRestore = false 
  }: {
    pname: string,
    isSystem?: boolean,
    noRestore?: boolean
  }) => {
    await api("POST", "create", undefined, { 
      pid: pname,
      is_system: isSystem,
      no_restore: noRestore
    });

    return root.programs().one({ pname });
  },
};

export const Program = {
  // Returns a graph reference to the program
  gref: (_, { obj }) => root.programs().one({ pname: obj.pname || obj.name }),
 
  // Updates a program with new source code, schema, and other attributes
  // Sends a POST request to update the program and logs the response
  update: async ({
    sourceCode,
    sourceMap,
    dependencies = {},
    expressions = {},
    schema,
    noRestore = false,
    versionHash,
  }: {
    sourceCode;
    sourceMap;
    dependencies?; 
    expressions?; 
    schema;
    noRestore?;
    versionHash;
  }, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    
    const updatePayload: any = {
      pid: pname,
      source_code: sourceCode,
      source_map: sourceMap,
      schema,
      version_hash: versionHash,
      dependencies,
      expressions,
      no_restore: noRestore
    };
  
    const result = await api("POST", "update", undefined, updatePayload);
    console.log("Update response:", result);
    return result;
  },

  // Terminates a running program
  // Sends a POST request to kill the program
  kill: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    return api("POST", "kill", undefined, { pid: pname });
  },

  // Retrieves logs for a program within a specified time range
  // Sends a GET request with optional after and before parameters
  logs: async ({ after, before }, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const queryParams: Record<string, any> = {};
    
    if (after !== undefined) queryParams.after = after;
    if (before !== undefined) queryParams.before = before;

    return api("GET", `logs/${pname}`, queryParams);
  },

  // Demo Logs
  getRecentLogs: async (_, { self }) => {
    try {
      const logsResponse = await Program.logs({ after: "0", before: "10" }, { self });

      if (typeof logsResponse === 'string') {
        // Split the string into individual JSON objects
        const logEntries = logsResponse.split('}').filter(entry => entry.trim() !== '').map(entry => entry + '}');
        
        const processedLogs = logEntries.map(entry => {
          try {
            return JSON.parse(entry);
          } catch (err) {
            console.warn(`Failed to parse log entry: ${entry}`);
            return { error: 'Failed to parse log entry', raw: entry };
          }
        });

        console.log(JSON.stringify(processedLogs, null, 2));
        return processedLogs;
      } else {
        console.log("Unexpected logs response format:", logsResponse);
        return { error: "Unexpected logs response format" };
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      return { error: `Error fetching logs: ${error.message}` };
    }
  },

  // Retrieves the schema for a program
  // Sends a GET request to fetch the schema
  schema: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    return api("GET", `schema/${pname}`);
  },

  // Retrieves the source code for a program
  // Sends a GET request with the source_code parameter set to true
  sourceCode: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { source_code: "true" });
    return data.source_code;
  },

  // Retrieves the source map for a program
  // Sends a GET request with the source_map parameter set to true
  sourceMap: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { source_map: "true" });
    return data.source_map;
  },

  // Retrieves the timers for a program
  // Sends a GET request with the timers parameter set to true
  timers: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { timers: "true" });
    return data.timers;
  },

  // Retrieves the expressions for a program
  // Sends a GET request with the expressions parameter set to true
  expressions: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { expressions: "true" });
    return data.expressions;
  },

  // Retrieves the subscriptions for a program
  // Sends a GET request with the subscriptions parameter set to true
  subscriptions: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { subscriptions: "true" });
    return data.subscriptions;
  },

  // Retrieves the last sequence number for a program
  // Sends a GET request with the last_seq parameter set to true
  lastSeq: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { last_seq: "true" });
    return data.last_seq;
  },

  // Retrieves the version sequence number for a program
  // Sends a GET request with the version_seq parameter set to true
  versionSeq: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { version_seq: "true" });
    return data.version_seq;
  },

  // Retrieves the version hash for a program
  // Sends a GET request with the version_hash parameter set to true
  versionHash: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { version_hash: "true" });
    return data.version_hash;
  },

  // Retrieves the epoch for a program
  // Sends a GET request with the epoch parameter set to true
  epoch: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const data = await api("GET", `program_details/${pname}`, { epoch: "true" });
    return data.epoch;
  },

  // Retrieves all details for a program
  // Makes multiple API calls to fetch various program attributes
  allDetails: async (_, { self }) => {
    const { pname } = self.$argsAt(root.programs().one);
    const [
      basicDetails,
      schema,
      sourceCode,
      sourceMap,
      timers,
      expressions,
      subscriptions,
      lastSeq,
      versionSeq,
      versionHash,
      epoch
    ] = await Promise.all([
      api("GET", `program_details/${pname}`),
      Program.schema(_, { self }),
      Program.sourceCode(_, { self }),
      Program.sourceMap(_, { self }),
      Program.timers(_, { self }),
      Program.expressions(_, { self }),
      Program.subscriptions(_, { self }),
      Program.lastSeq(_, { self }),
      Program.versionSeq(_, { self }),
      Program.versionHash(_, { self }),
      Program.epoch(_, { self })
    ]);

    return {
      ...basicDetails,
      schema,
      sourceCode,
      sourceMap,
      timers,
      expressions,
      subscriptions,
      lastSeq,
      versionSeq,
      versionHash,
      epoch
    };
  }
};

export const FileCollection = {
  // Retrieves details of a single file or directory
  // Sends a GET request to fetch file/directory information
  one: async ({ path }) => {
    const data = await api("GET", "fs/stat", { path });
    return { ...data, ...File };
  },

  // Lists contents of a directory
  // Sends a GET request to fetch directory contents
  page: async ({ path = '/' }) => {
    const data = await api("GET", "fs/dir", { path });
    return {
      items: data.map(item => ({ ...item, ...File })),
      next: null
    };
  },

  // Creates a new directory
  // Sends a PUT request to create the directory
  create: async ({ path, overwrite = false }) => {
    return api("PUT", "fs/dir", { path, overwrite });
  },

  // Lists all files and directories
  // Sends a GET request to fetch all file system entries
  all: async () => {
    const data = await api("GET", "fs/files");
    return data.map(item => ({ ...item, ...File }));
  },

  // Searches for files and directories
  // Sends a POST request with search parameters
  search: async ({ query, includes, excludes, flags, max_results = 2000 }) => {
    return api("POST", "fs/search", undefined, { 
      searches: [{ query, includes, excludes, flags, max_results }] 
    });
  }
};

// TODO: fix reference to file/directory

export const File = {
  // Returns a graph reference to the file/directory

  // Not working
  gref: (_, { self }) => {
    const { path } = self.$argsAt(root.files().one);
    return root.files().one({ path });
  },

  // Reads the contents of a file
  // Checks if it's a directory first, then attempts to read if it's a file
  read: async (_, { self }) => {
    const { path } = self.$argsAt(root.files().one);
    const statInfo = await File.stat(_, { self });
    
    if (statInfo.isDirectory) {
      throw new Error("You cannot read a directory. It must be a file.");
    }
    
    try {
      return await api("GET", "fs/file", { path });
    } catch (error) {
      // If any error occurs during reading, we'll assume it's due to trying to read a directory
      throw new Error("You cannot read a directory. It must be a file.");
    }
  },

  // Writes content to a file
  // Sends a PUT request to update file contents

  // Used asterik and empty string for Etag - If-Match and it didn't work

  // Still running into ETag precondition failed error
  write: async ({ content, overwrite = true }, { self }) => {
    const { path } = self.$argsAt(root.files().one);

    try {
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const base64Content = Buffer.from(content).toString('base64');

      const result = await api(
        "PUT",
        "fs/file",
        { path: encodedPath, overwrite: overwrite.toString() },
        base64Content,
        { 'Content-Type': 'text/plain' }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error(`Error saving file ${path}:`, error);
      return { success: false, error: error.message };
    }
  },
  

  // Deletes a file or director
  // Sends a DELETE request to remove the file/directory
  delete: async (_, { self }) => {
    const { path } = self.$argsAt(root.files().one);
    return api("DELETE", "fs", { path });
  },

  // Moves a file or directory to a new location
  // Sends a POST request to rename/move the file/directory
  move: async ({ to, overwrite = false }, { self }) => {
    const { path } = self.$argsAt(root.files().one);
    return api("POST", "fs/rename", undefined, { path, new_path: to, overwrite });
  },

  // Retrieves file or directory information
  // Sends a GET request to fetch file/directory stats
  stat: async (_, { self }) => {
    const { path } = self.$argsAt(root.files().one);
    const statInfo = await api("GET", "fs/stat", { path });
    return {
      ...statInfo,
      isDirectory: statInfo.type === 2
    };
  }
};

export const PackageCollection = {
  // Retrieves details of a single package
  // Sends a GET request to fetch package information
  one: async ({ publisher, name, version }) => {
    const path = version ? `package/${publisher}/${name}/${version}` : `package/${publisher}/${name}`;
    const data = await api("GET", path);
    return { ...data.package, ...Package };
  },

  // Retrieves a page of packages
  // Sends a GET request to search for packages

  // Only 10 packages are returned at the moment
  page: async () => {
    const data = await api("GET", "package/search"); 
    return {
      items: data.results || [],
      next: null
    };
  },

  // Searches for packages
  // Sends a GET request with a search query, page number, and page size
  search: async ({ q, page, pageSize }) => {
    return api("GET", "package/search", { q, page, pageSize });
  },

  // Creates a new package
  // Sends a POST request to create a package
  create: async ({ name, path}) => {
    return api("POST", "package", undefined, { 
      name, 
      path,
    });
  },
};

export const Package = {
  // Returns a graph reference to the package
  gref: (_, { obj }) => {
    const version = obj.version !== undefined ? parseInt(obj.version, 10) : undefined;
    return root.packages().one({
      publisher: obj.publisher,
      name: obj.name,
      version,
    });
  },
};

async function api(method: string, path: string, query?: Record<string, any>, body?: any, customHeaders: Record<string, string> = {}) {
  const url = new URL(`http://api.membrane.io/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, stringifyQueryParam(value));
      }
    });
  }
  
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${state.token}`,
    ...customHeaders
  };

  if (typeof body === 'string') {
    headers["Content-Type"] = "text/plain";
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  let responseData;

  if (contentType && contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  return responseData;
}

function stringifyQueryParam(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return value.map(stringifyQueryParam).join(',');
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}


export const Tests = {
  testRootAction: async () => {
    try {
      const result = await root.action({ gref: "mem:programs.one(pname:\"test\").kill" });
      console.log("Root Action Result:", result);
      return result;
    } catch (error) {
      console.error("Root Action Error:", error);
      throw error;
    }
  },

  testRootQuery: async () => {
    try {
      const result = await root.query({ 
        gref: "mem:programs.one(pname:\"discord\")", 
        query: "{ status sourceCode timers }"
      });
      console.log("Root Query Result:", result);
      return result;
    } catch (error) {
      console.error("Root Query Error:", error);
      throw error;
    }
  },

  testProgramCollectionOne: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      console.log("Program Collection One Result:", program);
      return program;
    } catch (error) {
      console.error("Program Collection One Error:", error);
      throw error;
    }
  },

  testProgramCollectionPage: async () => {
    try {
      const page = await root.programs().page();
      console.log("Program Collection Page Result:", page.items);
      return page.items;
    } catch (error) {
      console.error("Program Collection Page Error:", error);
      throw error;
    }
  },

  testProgramCollectionCreate: async () => {
    try {
      const program = await root.programs().create({ pname: "newnew-test-program" });
      console.log("Program Collection Create Result:", program);
      return program;
    } catch (error) {
      console.error("Program Collection Create Error:", error);
      throw error;
    }
  },

  testProgramGref: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const gref = await program.gref();
      console.log("Program Gref Result:", gref);
      return gref;
    } catch (error) {
      console.error("Program Gref Error:", error);
      throw error;
    }
  },

  testProgramUpdate: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const result = await program.update({
        sourceCode: "console.log('test')",
        sourceMap: "{}",
        dependencies: {},
        expressions: {},
        schema: { types: [] },
        noRestore: false,
        versionHash: "test-hash2"
      });
      console.log("Program Update Result:", result);
      return result;
    } catch (error) {
      console.error("Program Update Error:", error);
      throw error;
    }
  },

  testProgramKill: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const result = await program.kill();
      console.log("Program Kill Result:", result);
      return result;
    } catch (error) {
      console.error("Program Kill Error:", error);
      throw error;
    }
  },

  testProgramLogs: async () => {
    try {
      const program = await root.programs().one({ pname: "mem" });
      const logsResponse = await program.logs({ after: "0", before: "10" });
  
      console.log("Raw logs response:", logsResponse);
  
      if (typeof logsResponse === 'string') {
        // Split the string into individual JSON objects
        const logEntries = logsResponse.match(/\{[^\}]+\}/g) || [];
        
        const processedLogs = logEntries.map((entry, index) => {
          try {
            const parsedEntry = JSON.parse(entry);
            console.log(`Log ${index + 1}:`, JSON.stringify(parsedEntry, null, 2));
            return parsedEntry;
          } catch (err) {
            console.warn(`Failed to parse log entry ${index + 1}:`, entry);
            return { error: 'Failed to parse log entry', raw: entry };
          }
        });
  
        console.log("All processed logs:", JSON.stringify(processedLogs, null, 2));
        return processedLogs;
      } else {
        console.log("Unexpected logs response format:", logsResponse);
        return { error: "Unexpected logs response format" };
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      return { error: `Error fetching logs: ${error.message}` };
    }
  },

  testProgramSchema: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const schema = await program.schema();
      console.log("Program Schema Result:", schema);
      return schema;
    } catch (error) {
      console.error("Program Schema Error:", error);
      throw error;
    }
  },

  testProgramSourceCode: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const sourceCode = await program.sourceCode();
      console.log("Program Source Code Result:", sourceCode);
      return sourceCode;
    } catch (error) {
      console.error("Program Source Code Error:", error);
      throw error;
    }
  },

  testProgramSourceMap: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const sourceMap = await program.sourceMap();
      console.log("Program Source Map Result:", sourceMap);
      return sourceMap;
    } catch (error) {
      console.error("Program Source Map Error:", error);
      throw error;
    }
  },

  testProgramTimers: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const timers = await program.timers();
      console.log("Program Timers Result:", timers);
      return timers;
    } catch (error) {
      console.error("Program Timers Error:", error);
      throw error;
    }
  },

  testProgramExpressions: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const expressions = await program.expressions();
      console.log("Program Expressions Result:", expressions);
      return expressions;
    } catch (error) {
      console.error("Program Expressions Error:", error);
      throw error;
    }
  },

  testProgramSubscriptions: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const subscriptions = await program.subscriptions();
      console.log("Program Subscriptions Result:", subscriptions);
      return subscriptions;
    } catch (error) {
      console.error("Program Subscriptions Error:", error);
      throw error;
    }
  },

  testProgramLastSeq: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const lastSeq = await program.lastSeq();
      console.log("Program Last Seq Result:", lastSeq);
      return lastSeq;
    } catch (error) {
      console.error("Program Last Seq Error:", error);
      throw error;
    }
  },

  testProgramVersionSeq: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const versionSeq = await program.versionSeq();
      console.log("Program Version Seq Result:", versionSeq);
      return versionSeq;
    } catch (error) {
      console.error("Program Version Seq Error:", error);
      throw error;
    }
  },

  testProgramVersionHash: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const versionHash = await program.versionHash();
      console.log("Program Version Hash Result:", versionHash);
      return versionHash;
    } catch (error) {
      console.error("Program Version Hash Error:", error);
      throw error;
    }
  },

  testProgramEpoch: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const epoch = await program.epoch();
      console.log("Program Epoch Result:", epoch);
      return epoch;
    } catch (error) {
      console.error("Program Epoch Error:", error);
      throw error;
    }
  },

  testProgramAllDetails: async () => {
    try {
      const program = await root.programs().one({ pname: "test-program" });
      const allDetails = await program.allDetails();
      console.log("Program All Details Result:", allDetails);
      return allDetails;
    } catch (error) {
      console.error("Program All Details Error:", error);
      throw error;
    }
  },

  testFileCollectionOne: async () => {
    try {
      const file = await root.files().one({ path: "/test-program/index.ts" });
      console.log("File Collection One Result:", file);
      return file;
    } catch (error) {
      console.error("File Collection One Error:", error);
      throw error;
    }
  },

  testFileCollectionPage: async () => {
    try {
      const page = await root.files().page({ path: "/" });
      console.log("File Collection Page Result:", page.items);
      return page.items;
    } catch (error) {
      console.error("File Collection Page Error:", error);
      throw error;
    }
  },


  /* Strange bug if you create some empty dirs then delete the parent 
  * and you create a dir with the same name again the empty dirs within the parent show up
  */
  testFileCollectionCreate: async () => {
    try {
      // Test directory creation
      await root.files().create({
        path: "/testprogram/",
      });
      console.log("Successfully created directory: /testprogram/");
    } catch (error) {
      console.error("File Collection Create Error:", error);
      throw error;
    }
  },

 
  testFileDelete: async () => {
    try {
      const file = await root.files().one({ path: "/test-file.txt" });
      const result = await file.delete();
      console.log("File Delete Result:", result);
      return result;
    } catch (error) {
      console.error("File Delete Error:", error);
      throw error;
    }
  },

  
  testFileMove: async () => {
    try {
      const file = await root.files().one({ path: "/test-file.txt" });
      const result = await file.move({ to: "/moved-test-file.txt" });
      console.log("File Move Result:", result);
      return result;
    } catch (error) {
      console.error("File Move Error:", error);
      throw error;
    }
  },

  testFileCollectionSearch: async () => {
    try {
      const result = await root.files().search({ query: "test" });
      console.log("File Collection Search Result:", result);
      return result;
    } catch (error) {
      console.error("File Collection Search Error:", error);
      throw error;
    }
  },

  testFileCollectionAll: async () => {
    try {
      const result = await root.files().all();
      console.log("File Collection All Result:", result);
      return result;
    } catch (error) {
      console.error("File Collection All Error:", error);
      throw error;
    }
  },

  testFileGref: async () => {
    try {
      const file = await root.files().one({ path: "/test-program/index.ts" });
      const gref = await file.gref();
      console.log("File Gref Result:", gref);
      return gref;
    } catch (error) {
      console.error("File Gref Error:", error);
      throw error;
    }
  },

  testFileRead: async () => {
    try {
      const file = await root.files().one({ path: "/test-program/index.ts" });
      const content = await file.read();
      console.log("File Read Result:", content);
      return content;
    } catch (error) {
      console.error("File Read Error:", error);
      throw error;
    }
  },

  testFileWrite: async () => {
    try {
      // Test writing to an existing file
      console.log("Testing write to existing file:");
      const existingFile = await root.files().one({ path: "/mem/test.txt" });
      let result = await existingFile.write({ content: "Updated content for existing file test!" });
      console.log("Existing file write result:", result);
  
      return "File write tests completed successfully.";
    } catch (error) {
      console.error("File Write Test Error:", error);
      throw error;
    }
  },


  testFileStat: async () => {
    try {
      const file = await root.files().one({ path: "/test-file.txt" });
      const stat = await file.stat();
      console.log("File Stat Result:", stat);
      return stat;
    } catch (error) {
      console.error("File Stat Error:", error);
      throw error;
    }
  },

  testPackageCollectionOne: async () => {
    try {
      const pkg = await root.packages().one({ publisher: "test-publisher", name: "test-package" });
      console.log("Package Collection One Result:", pkg);
      return pkg;
    } catch (error) {
      console.error("Package Collection One Error:", error);
      throw error;
    }
  },

  testPackageCollectionPage: async () => {
    try {
      const page = await root.packages().page();
      console.log("Package Collection Page Result:", page.items);
      return page.items;
    } catch (error) {
      console.error("Package Collection Page Error:", error);
      throw error;
    }
  },


  testPackageCollectionSearch: async () => {
    try {
      const result = await root.packages().search({ q: "iamseeley", page: 1, pageSize: 10 });
      console.log("Package Collection Search Result:", result);
      return result;
    } catch (error) {
      console.error("Package Collection Search Error:", error);
      throw error;
    }
  },

  testPackageCollectionCreate: async () => {
    try {
      const result = await root.packages().create({ name: "new-test-package", path: "/path/to/package" });
      console.log("Package Collection Create Result:", result);
      return result;
    } catch (error) {
      console.error("Package Collection Create Error:", error);
      throw error;
    }
  },

  testPackageGref: async () => {
    try {
      const pkg = await root.packages().one({ publisher: "test-publisher", name: "test-package" });
      const gref = await pkg.gref();
      console.log("Package Gref Result:", gref);
      return gref;
    } catch (error) {
      console.error("Package Gref Error:", error);
      throw error;
    }
  },

  // runAllTests: async () => {
  //   const testResults = {};
  //   const testFunctions = Object.keys(Tests).filter(key => key.startsWith('test') && key !== 'runAllTests');

  //   for (const testName of testFunctions) {
  //     try {
  //       console.log(`Running ${testName}...`);
  //       const result = await Tests[testName]();
  //       testResults[testName] = { success: true, data: result };
  //       console.log(`✅ ${testName} passed`);
  //     } catch (error) {
  //       testResults[testName] = { success: false, error: error.message };
  //       console.error(`❌ ${testName} failed with error:`, error);
  //     }
  //     console.log('\n'); // Add a newline for better readability between tests
  //   }

  //   console.log('All tests completed. Summary:');
  //   for (const [testName, result] of Object.entries(testResults)) {
  //     if (result.success) {
  //       console.log(`✅ ${testName}: Passed`);
  //     } else {
  //       console.log(`❌ ${testName}: Failed - ${result.error}`);
  //     }
  //   }

  //   const passedTests = Object.values(testResults).filter(result => result.success).length;
  //   const totalTests = testFunctions.length;
  //   console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);

  //   return testResults;
  // }
};