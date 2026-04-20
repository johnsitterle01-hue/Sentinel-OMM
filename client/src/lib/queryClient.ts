import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey.
    // - first element is the base path (e.g. "/api/candles")
    // - subsequent string/number/boolean segments are joined as path parts
    // - a final plain-object segment (if any) becomes the query string
    const [base, ...rest] = queryKey as [string, ...unknown[]];
    let params: Record<string, string> | null = null;
    let pathParts: unknown[] = rest;
    const last = rest[rest.length - 1];
    if (last && typeof last === "object" && !Array.isArray(last)) {
      params = last as Record<string, string>;
      pathParts = rest.slice(0, -1);
    }
    const pathTail = pathParts
      .filter((p) => p !== undefined && p !== null && p !== "")
      .map((p) => encodeURIComponent(String(p)))
      .join("/");
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).reduce((acc, [k, v]) => {
            if (v !== undefined && v !== null) acc[k] = String(v);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : "";
    const url = `${API_BASE}${base}${pathTail ? "/" + pathTail : ""}${qs}`;
    const res = await fetch(url);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
