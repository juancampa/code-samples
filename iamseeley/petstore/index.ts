import { state, root } from "membrane";

state.apiKey = state.apiKey ?? null;

export const Root = {
  status() {
    if (!state.apiKey) {
      return "Get an [OpenWeather API key](https://openweathermap.org) and then [configure](:configure) it.";
    }
    return "Ready";
  },
  async configure({ apiKey }) {
    state.apiKey = apiKey ?? state.apiKey;
  },
  async weather({ units, zipCode, countryCode }) {
    const zip = `${zipCode},${countryCode ?? "US"}`;
    const res = await api("geo/1.0/zip", { zip });
    const { lat, lon } = await res.json();
    const query = { lat, lon, units: units ?? "standard" };
    const weatherRes = await api("data/2.5/onecall", query);
    if (weatherRes.status !== 200) {
      throw new Error(`OpenWeather API returned ${weatherRes.status}: ${weatherRes.text()}`);
    }
    return await weatherRes.json();
  },
};

export const Tests = {
  testWeatherTemp: async () => {
    const temp = await root.weather({ zipCode: "10001" }).current.temp;
    return typeof temp === "number";
  },
};

export const Weather = {
  current: (_, { obj }) => obj.current,
  hourly: (_, { obj }) => obj.hourly,
  daily: (_, { obj }) => obj.daily,
  minutely: (_, { obj }) => obj.minutely,
};

async function api(method: "GET" | "POST", path: string, query?: any, body?: string | object) {
  if (query) {
    Object.keys(query).forEach((key) => query[key] === undefined ? delete query[key] : {});
  }
  const querystr = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";
  return await fetch(`https://api.openweathermap.org/${path}${querystr}`, {
    method,
    body: typeof body === "object" ? JSON.stringify(body) : body,
    headers: {
      Authorization: `Bearer ${state.apiKey}`,
      "Content-Type": "application/json",
    },
  });
}
