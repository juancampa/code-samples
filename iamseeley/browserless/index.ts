import { state, root } from "membrane";

const baseUrl = `production-sfo.browserless.io`;

type Method = "GET" | "POST";

async function api(
  method: Method,
  path: string,
  query?: any,
  body?: any
) {
  if (!state.apiKey) {
    throw new Error("You must be authenticated to use this API.");
  }

  const queryParams = new URLSearchParams(query || {});
  queryParams.append('token', state.apiKey);
  const queryString = `?${queryParams.toString()}`;
  const url = `https://${baseUrl}/${path}${queryString}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (method === "POST" && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}


export const Root = {
  status() {
    return state.apiKey ? "Configured" : "Not configured";
  },
  content: () => ({}),
  download: () => ({}),
  function: () => ({}),
  pdf: () => ({}),
  screenshot: () => ({}),
  unblock: () => ({}),
  scrape: () => ({}),
  performance: () => ({}),
  sessions: () => ({}),
  config: () => ({}),
  metrics: () => ({}),
  totalMetrics: () => ({}),
  tests: () => ({}),
  configure: async ({ apiKey }) => {
    state.apiKey = apiKey;
  },
};

export const ContentEndpoint = {
  async capture({ url, rejectResourceTypes, rejectRequestPattern, gotoOptions, bestAttempt, waitForEvent, waitForFunction, waitForSelector, waitForTimeout }) {
    const response = await api("POST", "content", null, {
      url,
      rejectResourceTypes,
      rejectRequestPattern,
      gotoOptions,
      bestAttempt,
      waitForEvent,
      waitForFunction,
      waitForSelector,
      waitForTimeout,
    });
    return response.text();
  },
};

export const DownloadEndpoint = {
  async getFiles({ code, context }) {
    const response = await api("POST", "download", null, { 
      code: `async function downloadCode({ page }) {
        ${code}
      }`,
      context 
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  },
};

export const FunctionEndpoint = {
  async run({ code, context }) {
    const response = await api("POST", "function", null, { code, context });
    return response.json();
  },
};

export const PdfEndpoint = {
  async capture({ url, options, html, addScriptTag, addStyleTag, gotoOptions, bestAttempt, waitForEvent, waitForFunction, waitForSelector }) {
    const response = await api("POST", "pdf", null, {
      url,
      options,
      html,
      addScriptTag,
      addStyleTag,
      gotoOptions,
      bestAttempt,
      waitForEvent,
      waitForFunction,
      waitForSelector,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  },
};

export const ScreenshotEndpoint = {
  async capture({ url, options, html, addScriptTag, addStyleTag, gotoOptions, bestAttempt, waitForEvent, waitForFunction, waitForSelector }) {
    const response = await api("POST", "screenshot", null, {
      url,
      options,
      html,
      addScriptTag,
      addStyleTag,
      gotoOptions,
      bestAttempt,
      waitForEvent,
      waitForFunction,
      waitForSelector,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  },
};

export const UnblockEndpoint = {
  async bypass({ url, browserWSEndpoint, cookies, content, screenshot, ttl, waitForEvent, waitForFunction, waitForSelector }) {
    const response = await api("POST", "unblock", null, {
      url,
      browserWSEndpoint,
      cookies,
      content,
      screenshot,
      ttl,
      waitForEvent,
      waitForFunction,
      waitForSelector,
    });
    return response.json();
  },
};

export const ScrapeEndpoint = {
  async scrape({ url, elements, gotoOptions, waitForTimeout, waitForSelector, waitForFunction, waitForEvent }) {
    const response = await api("POST", "scrape", null, {
      url,
      elements,
      gotoOptions,
      waitForTimeout,
      waitForSelector,
      waitForFunction,
      waitForEvent,
    });
    return response.json();
  },
};

export const PerformanceEndpoint = {
  async gather({ url, config }) {
    const response = await api("POST", "performance", null, { url, config });
    return response.json();
  },
};

export const SessionsEndpoint = {
  async get() {
    const response = await api("GET", "sessions");
    return response.json();
  },
};

export const ConfigEndpoint = {
  async get() {
    const response = await api("GET", "config");
    return response.json();
  },
};

export const MetricsEndpoint = {
  async get() {
    const response = await api("GET", "metrics");
    return response.json();
  },
};

export const TotalMetricsEndpoint = {
  async get() {
    const response = await api("GET", "metrics/total");
    return response.json();
  },
};

export const Tests = {
  testCapture: async () => {
    const content = await root.content.capture({ url: "https://example.com" });
    return typeof content === "string" && content.length > 0;
  },
  testScreenshot: async () => {
    const screenshot = await root.screenshot.capture({ url: "https://example.com" });
    return typeof screenshot === "string" && screenshot.length > 0;
  },
  testPdf: async () => {
    const pdf = await root.pdf.capture({ url: "https://example.com" });
    return typeof pdf === "string" && pdf.length > 0;
  },
  testDownload: async () => {
    const files = await root.download.getFiles({ 
      code: `
        const content = 'Hello, World!';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        await page.evaluate((downloadUrl) => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = 'test.txt';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, url);
      `
    });
    return typeof files === "string" && files.length > 0;
  },
  testScrape: async () => {
    const result = await root.scrape.scrape({
      url: "https://example.com",
      elements: [{ selector: "h1" }],
    });
    return typeof result === "object" && result.title === "Example Domain";
  },
  testFunction: async () => {
    const result = await root.function.run({ 
      code: "return { message: 'Hello World' };" 
    });
    return typeof result === "object" && result.message === "Hello World";
  },
  testUnblock: async () => {
    const result = await root.unblock.bypass({ 
      url: "https://example.com",
      content: true
    });
    return typeof result === "object" && typeof result.content === "string";
  },
  testPerformance: async () => {
    const result = await root.performance.gather({ url: "https://example.com" });
    return typeof result === "object" && typeof result.navigationTiming === "object";
  },
  testSessions: async () => {
    const sessions = await root.sessions.get();
    return Array.isArray(sessions);
  },
  testConfig: async () => {
    const config = await root.config.get();
    return typeof config === "object" && typeof config.version === "string";
  },
  testMetrics: async () => {
    const metrics = await root.metrics.get();
    return Array.isArray(metrics);
  },
  testTotalMetrics: async () => {
    const totalMetrics = await root.totalMetrics.get();
    return typeof totalMetrics === "object" && typeof totalMetrics.running === "number";
  },
};