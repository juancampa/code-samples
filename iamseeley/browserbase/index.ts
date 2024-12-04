import { state, root } from "membrane";

/* TODO: Figure out why there are session replays or logs are showing in browserbase dashboard when the requests are successfull.
*  
*/

const baseUrl = "https://www.browserbase.com/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

state.client = state.client ?? null;
state.projectId = state.projectId ?? null;

async function api(method: Method, path: string, query?: any, body?: any, isBinary: boolean = false, isMultipart: boolean = false, customHeaders?: Record<string, string>) {
  if (!state.apiKey) {
    throw new Error("You must be authenticated to use this API.");
  }

  const queryString = query ? `?${new URLSearchParams(query)}` : "";
  const url = `${baseUrl}/${path}${queryString}`;

  const headers: Record<string, string> = {
    "X-BB-API-Key": state.apiKey,
    ...(customHeaders || {})
  };

  if (!isMultipart && !isBinary && !customHeaders) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? (isBinary || isMultipart ? body : JSON.stringify(body)) : undefined,
  });

  const responseData = {
    status: response.status,
    headers: JSON.stringify(Object.fromEntries(response.headers.entries())),
    body: await response.text(),
  };

  if (!response.ok) {
    throw new Error(JSON.stringify(responseData));
  }

  if (isBinary) {
    return Buffer.from(responseData.body, 'base64');
  } else {
    if (response.headers.get("content-type")?.includes("application/json")) {
      return JSON.parse(responseData.body);
    } else {
      return responseData.body;
    }
  }
}


export const Root = {
  status() {
    if (state.apiKey && state.projectId) {
      return "Configured";
    } else if (state.apiKey) {
      return "Partially Configured (Missing Project ID)";
    } else if (state.projectId) {
      return "Partially Configured (Missing API Key)";
    } else {
      return "Not Configured";
    }
  },

  contexts: () => ({}),
  extensions: () => ({}),
  projects: () => ({}),
  sessions: () => ({}),

  async configure({ apiKey, projectId }) {
    state.apiKey = apiKey;
    state.projectId = projectId;
  },
};

export const ContextCollection = {
  async create({ projectId }) {
    return await api("POST", "contexts", null, { projectId: projectId || state.projectId });
  },
};

export const ExtensionCollection = {
  async upload({ file }) {
    const boundary = "----Boundary" + Math.random().toString(36).substring(2); // Generate unique boundary
    const multipartBody = buildMultipartBody(file, boundary);

    // Use the api function with multipart flag set to true
    return await api("POST", "extensions", null, multipartBody, true, true);
  },

  async one({ id }) {
    return await api("GET", `extensions/${id}`);
  },
};

export const Extension = {
  gref: (_, { obj }) => root.extensions.one({ id: obj.id }),

  async delete(_, { self }) {
    const { id } = self.$argsAt(root.extensions.one);
    await api("DELETE", `extensions/${id}`);
  },
};

export const ProjectCollection = {
  async one({ id }) {
    return { id: id || state.projectId };
  },
};

export const Project = {
  gref: (_, { obj }) => root.projects.one({ id: obj.id }),

  async usage(_, { self }) {
    const { id } = self.$argsAt(root.projects.one);
    return await api("GET", `projects/${id}/usage`);
  },
};

export const SessionCollection = {
  one: async ({ id }) => {
    const sessions = await api("GET", "sessions");
    const session = sessions.find(s => s.id === id);
    if (!session) {
      throw new Error(`Session with id ${id} not found`);
    }
    return session;
  },

  page: async ({ status }) => {
    const query = status ? { status } : undefined;
    const sessions = await api("GET", "sessions", query);
    return {
      items: sessions,
      next: null // API doesn't seem to support pagination
    };
  },

  create: async ({ projectId, extensionId, browserSettings }) => {
    console.log("Creating new session with params:", { projectId, extensionId, browserSettings });
    const body = {
      projectId: projectId || state.projectId,
      ...(extensionId && { extensionId }),
      ...(browserSettings && { browserSettings })
    };
    try {
      const session = await api("POST", "sessions", null, body);
      console.log("Session created successfully:", session);
      return session;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  },
};

export const Session = {
  gref: (_, { obj }) => root.sessions.one({ id: obj.id }),

  id: (_, { obj }) => obj.id,
  createdAt: (_, { obj }) => obj.createdAt,
  updatedAt: (_, { obj }) => obj.updated_at,
  projectId: (_, { obj }) => obj.projectId,
  startedAt: (_, { obj }) => obj.startedAt,
  endedAt: (_, { obj }) => obj.endedAt,
  expiresAt: (_, { obj }) => obj.expiresAt,
  status: (_, { obj }) => obj.status,
  proxyBytes: (_, { obj }) => obj.proxyBytes,
  avg_cpu_usage: (_, { obj }) => obj.avg_cpu_usage,
  memory_usage: (_, { obj }) => obj.memory_usage,
  keep_alive: (_, { obj }) => obj.keep_alive,
  context_id: (_, { obj }) => obj.context_id,
  taskId: (_, { obj }) => obj.taskId,
  updated_at: (_, { obj }) => obj.updated_at,
  is_idle: (_, { obj }) => obj.is_idle,
  viewport_height: (_, { obj }) => obj.viewport_height,
  viewport_width: (_, { obj }) => obj.viewport_width,
  region: (_, { obj }) => obj.region,


  async update({ projectId, status }, { self }) {
    const { id } = self.$argsAt(root.sessions.one);
    if (status !== "REQUEST_RELEASE") {
      throw new Error("Only REQUEST_RELEASE is allowed as a status update");
    }
    return await api("POST", `sessions/${id}`, null, { projectId, status });
  },


  async downloads(_, { self }) {
    const { id } = self.$argsAt(root.sessions.one);
    return await api("GET", `sessions/${id}/downloads`, null, null, true);
  },

  async logs(_, { self }) {
    const { id } = self.$argsAt(root.sessions.one);
    return await api("GET", `sessions/${id}/logs`);
  },

  async recording(_, { self }) {
    const { id } = self.$argsAt(root.sessions.one);
    return await api("GET", `sessions/${id}/recording`);
  },

  async upload({ script }, { self }) {
    const { id } = self.$argsAt(root.sessions.one);

    const file = {
      name: "script.js",
      content: script,
      type: "application/javascript"
    };

    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const multipartBody = buildMultipartBody(file, boundary);

    const customHeaders = {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    };

    return await api("POST", `sessions/${id}/uploads`, null, multipartBody, false, true, customHeaders);
  },
};

// Helper function to construct multipart form-data body
function buildMultipartBody(file: { name: string; content: string; type: string }, boundary: string) {
  const CRLF = "\r\n";
  let body = '';
  body += `--${boundary}${CRLF}`;
  body += `Content-Disposition: form-data; name="file"; filename="${file.name}"${CRLF}`;
  body += `Content-Type: ${file.type}${CRLF}${CRLF}`;
  body += file.content + CRLF;
  body += `--${boundary}--${CRLF}`;
  return body;
}

export const Tests = {
  async runAllTests(): Promise<boolean[]> {
    console.log("Starting all tests");
    const results = [
      await this.testPageNavigation(),
      await this.testElementInteraction(),
      await this.testScreenshot(),
      await this.testMultiplePages()
    ];
    console.log("All tests completed. Results:", results);
    return results;
  },

  async testPageNavigation(): Promise<boolean> {
    console.log("Starting Page Navigation Test");
    try {
      const session = await root.sessions.create({
        projectId: state.projectId,
        browserSettings: { timeout: 30000 }
      });

      console.log("Session created:", session);

      if (!session || typeof session.id !== 'string') {
        throw new Error("Failed to create session or invalid session object returned");
      }

      const script = `
        await page.goto('https://example.com');
        const title = await page.title();
        console.log('Page title:', title);
        return title;
      `;

      await root.sessions.one({ id: session.id }).upload({ script: script });
      console.log("Page Navigation Test script uploaded and executed");

      return true;
    } catch (error) {
      console.error("Page Navigation Test failed:", error);
      return false;
    }
  },

  async testElementInteraction(): Promise<boolean> {
    console.log("Starting Element Interaction Test");
    try {
      const session = await root.sessions.create({
        projectId: state.projectId,
        browserSettings: { timeout: 30000 }
      });

      console.log("Session created:", session);

      if (!session || typeof session.id !== 'string') {
        throw new Error("Failed to create session or invalid session object returned");
      }

      const script = `
        await page.goto('https://example.com');
        const linkText = await page.$eval('a', el => el.textContent);
        console.log('Link text:', linkText);
        return linkText;
      `;

      await root.sessions.one({ id: session.id }).upload({ script: script });
      console.log("Element Interaction Test script uploaded and executed");

      return true;
    } catch (error) {
      console.error("Element Interaction Test failed:", error);
      return false;
    }
  },

  async testScreenshot(): Promise<boolean> {
    console.log("Starting Screenshot Test");
    try {
      const session = await root.sessions.create({
        projectId: state.projectId,
        browserSettings: { timeout: 30000 }
      });

      console.log("Session created:", session);

      if (!session || typeof session.id !== 'string') {
        throw new Error("Failed to create session or invalid session object returned");
      }

      const script = `
        await page.goto('https://example.com');
        await page.screenshot({ path: 'screenshot.png' });
        console.log('Screenshot taken: screenshot.png');
        return 'Screenshot taken';
      `;

      await root.sessions.one({ id: session.id }).upload({ script: script });
      console.log("Screenshot Test script uploaded and executed");

      return true;
    } catch (error) {
      console.error("Screenshot Test failed:", error);
      return false;
    }
  },

  async testMultiplePages(): Promise<boolean> {
    console.log("Starting Multiple Pages Test");
    try {
      const session = await root.sessions.create({
        projectId: state.projectId,
        browserSettings: { timeout: 30000 }
      });

      console.log("Session created:", session);

      if (!session || typeof session.id !== 'string') {
        throw new Error("Failed to create session or invalid session object returned");
      }

      const script = `
        const page1 = await browser.newPage();
        await page1.goto('https://example.com');
        console.log('Page 1 title:', await page1.title());
        const page2 = await browser.newPage();
        await page2.goto('https://www.example.org');
        console.log('Page 2 title:', await page2.title());
        return { title1: await page1.title(), title2: await page2.title() };
      `;

      await root.sessions.one({ id: session.id }).upload({ script: script });
      console.log("Multiple Pages Test script uploaded and executed");

      // Complete the session
      await root.sessions.one({ id: session.id }).update({ projectId: state.projectId, status: "COMPLETED" });
      console.log("Session completed");

      return true;
    } catch (error) {
      console.error("Multiple Pages Test failed:", error);
      return false;
    }
  }
};