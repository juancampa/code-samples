import { state } from "membrane";

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  tags: string[];
  created: string;
  updated: string;
}

// The State interface that Membrane will use
export interface State {
  tasks: Task[];
  nextId: number;
  API_KEY: string;
}

// Initialize state with an empty tasks array and an ID counter
state.tasks ??= [] as Task[];
state.nextId ??= 1;
state.API_KEY = "my-secret-key" // Set your secret key

// Parse query parameters
function parseQuery(query) {
  if (!query) return {};
  return Object.fromEntries(
    query.split('&').map(param => {
      const [key, value] = param.split('=');
      return [decodeURIComponent(key), decodeURIComponent(value)];
    })
  );
}

// Verify API key
function verifyApiKey(headers: string): boolean {
  try {
    const parsedHeaders = JSON.parse(headers);
    const authHeader = parsedHeaders['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '');
    return apiKey === state.API_KEY;
  } catch {
    return false;
  }
}

export async function endpoint({ method, path, body, headers, query }) {
  try {
    if (!state.API_KEY) {
      return JSON.stringify({ 
        status: 500, 
        error: 'API not configured. Please set an API key.' 
      });
    }

    if (!verifyApiKey(headers)) {
      return JSON.stringify({ 
        status: 401, 
        error: 'Invalid or missing API key' 
      });
    }

    // Parse the path to get potential ID parameter
    const pathParts = path.split('/').filter(Boolean);
    const taskId = pathParts[1] ? parseInt(pathParts[1]) : null;
    const queryParams = parseQuery(query);

    switch (`${method} /${pathParts[0] || ''}`) {
      case 'GET /tasks':
        if (taskId) {
          // Get specific task
          const task = state.tasks.find(t => t.id === taskId);
          if (!task) {
            return JSON.stringify({ 
              status: 404, 
              error: 'Task not found' 
            });
          }
          return JSON.stringify({ status: 200, data: task });
        }
        
        // List tasks with optional filtering
        let filteredTasks = [...state.tasks];
        if (queryParams.status) {
          filteredTasks = filteredTasks.filter(t => 
            t.status === queryParams.status
          );
        }
        if (queryParams.priority) {
          filteredTasks = filteredTasks.filter(t => 
            t.priority === queryParams.priority
          );
        }
        return JSON.stringify({ 
          status: 200, 
          data: filteredTasks 
        });

      case 'POST /tasks':
        if (!body) {
          return JSON.stringify({ 
            status: 400, 
            error: 'Missing request body' 
          });
        }

        const taskData = JSON.parse(body);
        if (!taskData.title) {
          return JSON.stringify({ 
            status: 400, 
            error: 'Title is required' 
          });
        }

        const newTask = {
          id: state.nextId++,
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate || null,
          tags: taskData.tags || [],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };

        state.tasks.push(newTask);
        return JSON.stringify({ 
          status: 201, 
          data: newTask 
        });

      case 'PUT /tasks':
        if (!taskId) {
          return JSON.stringify({ 
            status: 400, 
            error: 'Task ID is required' 
          });
        }
        if (!body) {
          return JSON.stringify({ 
            status: 400, 
            error: 'Missing request body' 
          });
        }

        const updateData = JSON.parse(body);
        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) {
          return JSON.stringify({ 
            status: 404, 
            error: 'Task not found' 
          });
        }

        const updatedTask = {
          ...state.tasks[taskIndex],
          ...updateData,
          id: taskId, // Prevent ID from being updated
          updated: new Date().toISOString()
        };

        state.tasks[taskIndex] = updatedTask;
        return JSON.stringify({ 
          status: 200, 
          data: updatedTask 
        });

      case 'DELETE /tasks':
        if (!taskId) {
          return JSON.stringify({ 
            status: 400, 
            error: 'Task ID is required' 
          });
        }

        const deleteIndex = state.tasks.findIndex(t => t.id === taskId);
        if (deleteIndex === -1) {
          return JSON.stringify({ 
            status: 404, 
            error: 'Task not found' 
          });
        }

        state.tasks.splice(deleteIndex, 1);
        return JSON.stringify({ 
          status: 200, 
          message: 'Task deleted successfully' 
        });

      default:
        return JSON.stringify({ 
          status: 404, 
          error: 'Endpoint not found' 
        });
    }
  } catch (error) {
    return JSON.stringify({ 
      status: 500, 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}