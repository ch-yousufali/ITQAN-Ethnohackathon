import type { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

/** True only when explicitly enabled and no real backend is configured. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1" && !process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Resolve a backend-provided URL for use in the browser. The API returns some
 * links (e.g. manuscript previews) as root-relative paths, which would otherwise
 * resolve against the frontend's origin instead of the API's.
 */
export function apiUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || !BASE_URL) return url;
  try {
    return new URL(url, BASE_URL).toString();
  } catch {
    return url;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "network" | "http" | "contract",
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  // The inlined env check lets production builds drop the demo bundle entirely.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1" && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    const { demoFetch } = await import("./demo/handler");
    return demoFetch(path, init);
  }
  if (!BASE_URL) {
    throw new ApiError("The research API is not configured. Set NEXT_PUBLIC_API_BASE_URL.", "config");
  }
  try {
    return await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError("Could not reach the research API. Check your connection and try again.", "network");
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // Non-JSON error body: fall through to the generic message.
  }
  return `The research API returned an error (${res.status}).`;
}

export async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  options: { method?: string; json?: unknown; form?: FormData } = {},
): Promise<z.output<S>> {
  const init: RequestInit = { method: options.method ?? "GET", headers: { Accept: "application/json" } };
  if (options.form) {
    init.body = options.form;
  } else if (options.json !== undefined) {
    init.body = JSON.stringify(options.json);
    init.headers = { ...init.headers, "Content-Type": "application/json" };
  }

  const res = await send(path, init);
  if (!res.ok) throw new ApiError(await errorMessage(res), "http", res.status);

  const parsed = schema.safeParse(await res.json().catch(() => undefined));
  if (!parsed.success) {
    console.error(`Contract mismatch on ${path}`, parsed.error.issues);
    throw new ApiError(
      "The API response did not match the expected format, so it was not displayed.",
      "contract",
    );
  }
  return parsed.data;
}
