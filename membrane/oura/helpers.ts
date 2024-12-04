import { state } from "membrane";

const OURA_V2_API_URL = "https://api.ouraring.com/v2/usercollection";
const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${OURA_V2_API_URL}${path}`, {
    method: "GET", // all Oura V2 API requests are GET, except webhooks
    headers: { Authorization: `Bearer ${state.personalAccessToken}` },
  });

  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function paginate(path, args, node) {
  const { params, nextArgs } = config(args);
  const { data } = await api<{ data: object[] }>(`${path}?${params}`);

  return {
    items: data.reverse(),
    next: nextArgs ? node.page(nextArgs) : null,
  };
}

function config(args: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { startDate, endDate, page, pageSize } = args;
  let nextArgs;

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  const pg = Math.max(page ?? 1, 1);
  const size = Math.min(10, pageSize ?? 7); // TODO: bound by actual Oura API limit?

  if (end.getTime() - start.getTime() > size * ONE_DAY_IN_MS) {
    end.setTime(end.getTime() - (pg - 1) * size * ONE_DAY_IN_MS);
    start.setTime(end.getTime() - (size - 1) * ONE_DAY_IN_MS);

    nextArgs = { startDate, endDate, page: pg + 1, pageSize: size };
  } else {
    if (!startDate) {
      start.setTime(end.getTime() - (size - 1) * ONE_DAY_IN_MS);
    }

    nextArgs = null;
  }

  const searchParams = new URLSearchParams();
  searchParams.append("start_date", start.toISOString().split("T")[0]);
  searchParams.append("end_date", end.toISOString().split("T")[0]);

  return {
    params: searchParams.toString(),
    nextArgs,
  };
}
