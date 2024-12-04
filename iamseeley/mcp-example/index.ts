import { nodes, state } from "membrane";
import { 
  Server,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError 
} from "@modelcontextprotocol/sdk";

// Initialize state for managing MCP connections
export interface State {
  connections: Record<string, {
    sessionId: string;
    lastSeen: number;
  }>;
  programsCache: {
    lastUpdated: number;
    programs?: any[];
  };
}

state.connections ??= {};
state.programsCache ??= { lastUpdated: 0 };

// Fetch programs and their actions using the Membrane API driver
async function getMembranePrograms() {
  // Use cache if less than 5 minutes old
  if (
    state.programsCache.programs && 
    Date.now() - state.programsCache.lastUpdated < 5 * 60 * 1000
  ) {
    return state.programsCache.programs;
  }

  try {
    // Query all programs and their actions through the Membrane API driver
    const programs = await nodes.membrane.programs.page({
      include_schemas: true,
      include_expressions: true
    });

    // Cache the results
    state.programsCache = {
      lastUpdated: Date.now(),
      programs: programs.items
    };

    return programs.items;
  } catch (error) {
    console.error("Error fetching programs:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch programs: ${error.message}`
    );
  }
}

// Convert program actions to MCP tool schemas
function getToolSchemaForAction(program: any, actionName: string) {
  const schema = program.schema;
  let inputSchema = {
    type: "object",
    properties: {},
    required: []
  };

  // Try to extract input schema from program schema if available
  if (schema?.types?.Root?.actions?.[actionName]?.args) {
    const args = schema.types.Root.actions[actionName].args;
    inputSchema.properties = args;
    inputSchema.required = Object.keys(args).filter(key => !args[key].optional);
  }

  return {
    name: `${program.name}.${actionName}`,
    description: `${actionName} action for ${program.name} program`,
    inputSchema
  };
}

// Handler for incoming MCP HTTP requests
export const endpoint = async (req: any) => {
  const { method, path, body, headers } = req;
  
  const sessionId = headers["mcp-session-id"];
  if (!sessionId) {
    return JSON.stringify({
      error: "Missing MCP session ID",
      status: 400
    });
  }

  state.connections[sessionId] = {
    sessionId,
    lastSeen: Date.now()
  };

  const server = new Server({
    name: "membrane-mcp-server",
    version: "0.1.0"
  }, {
    capabilities: {
      resources: {},
      tools: {}
    }
  });

  // Set up resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const programs = await getMembranePrograms();
    
    return {
      resources: programs.map(program => ({
        uri: `membrane://programs/${program.name}`,
        name: program.name,
        mimeType: "application/json",
        description: `Membrane program: ${program.name}`
      }))
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const programMatch = request.params.uri.match(/^membrane:\/\/programs\/(.+)$/);
    if (!programMatch) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid resource URI: ${request.params.uri}`
      );
    }

    const programName = programMatch[1];
    try {
      // Get program details using the Membrane API driver
      const program = await nodes.membrane.programs
        .one({ pname: programName })
        .$query(`{
          name
          description
          status
          schema
          actions {
            name
            description
            args
          }
        }`);

      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(program, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch program info: ${error.message}`
      );
    }
  });

  // Set up tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const programs = await getMembranePrograms();
    
    // Create a tool for each program action
    const tools = programs.flatMap(program => {
      const actions = program.schema?.types?.Root?.actions || {};
      return Object.keys(actions).map(actionName => 
        getToolSchemaForAction(program, actionName)
      );
    });

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Tool names are in format "programName.actionName"
    const [programName, actionName] = request.params.name.split(".");
    if (!programName || !actionName) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Invalid tool name format: ${request.params.name}`
      );
    }

    try {
      // Invoke the program action using the Membrane API driver
      const result = await nodes.membrane.programs
        .one({ pname: programName })
        .actions.one({ name: actionName })
        .$invoke(request.params.arguments || {});

      return {
        content: {
          mimeType: "application/json",
          text: JSON.stringify(result, null, 2)
        }
      };
    } catch (error) {
      return {
        content: {
          mimeType: "text/plain",
          text: `Failed to invoke ${programName}.${actionName}: ${error.message}`
        },
        isError: true
      };
    }
  });

  try {
    const message = JSON.parse(body);
    const response = await server.handleMessage(message);
    return JSON.stringify(response);
  } catch (error) {
    return JSON.stringify({
      error: error.message,
      status: 500
    });
  }
};

// Clean up old connections periodically
export async function cleanupConnections() {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [id, connection] of Object.entries(state.connections)) {
    if (now - connection.lastSeen > timeout) {
      delete state.connections[id];
    }
  }
}

// Configure timer to clean up connections
export async function configure() {
  // Run cleanup every 15 minutes
  cleanupConnections().$cron("0 */15 * * * *");
}