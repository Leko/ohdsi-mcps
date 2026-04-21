export type Env = {
  GA_MEASUREMENT_ID?: string;
  GA_API_SECRET?: string;
  ANALYTICS_ENABLED?: string;
  ANALYTICS_SALT?: string;
};

type Ga4Param = string | number;
type Ga4Event = { name: string; params: Record<string, Ga4Param> };

type Ga4Payload = {
  client_id: string;
  timestamp_micros: number;
  non_personalized_ads: false;
  events: Ga4Event[];
};

export type RequestContext = {
  serverSlug: string;
  sessionId: string | null;
  durationMs: number;
  httpStatus: number;
};

const GA4_COLLECT_URL = "https://www.google-analytics.com/mp/collect";

// Argument keys whose values are safe enums (not free text) and can be sent.
const SAFE_ARG_KEYS = new Set(["slug", "version", "table"]);

export function isAnalyticsEnabled(env: Env, req: Request): boolean {
  if (env.ANALYTICS_ENABLED === "false") return false;
  if (!env.GA_MEASUREMENT_ID || !env.GA_API_SECRET) return false;
  if (req.headers.get("dnt") === "1") return false;
  if (req.headers.get("sec-gpc") === "1") return false;
  const url = new URL(req.url);
  if (url.searchParams.get("analytics") === "0") return false;
  return true;
}

export async function deriveClientId(
  ip: string,
  userAgent: string,
  serverSlug: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(
    `${ip}|${userAgent}|${serverSlug}|${salt}`,
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function baseParams(ctx: RequestContext): Record<string, Ga4Param> {
  const params: Record<string, Ga4Param> = {
    server_slug: ctx.serverSlug,
    duration_ms: ctx.durationMs,
    is_error: ctx.httpStatus >= 400 ? 1 : 0,
    engagement_time_msec: 1,
  };
  if (ctx.sessionId) params["session_id"] = ctx.sessionId;
  return params;
}

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
};

function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)["jsonrpc"] === "2.0" &&
    typeof (value as Record<string, unknown>)["method"] === "string"
  );
}

function safeStr(value: unknown, maxLen = 100): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

export function eventsFromJsonRpc(
  message: unknown,
  ctx: RequestContext,
): Ga4Event[] {
  if (!isJsonRpcMessage(message)) return [];

  const { method, params } = message;
  const base = baseParams(ctx);
  const p = params as Record<string, unknown> | undefined;

  switch (method) {
    case "initialize": {
      const clientInfo = p?.["clientInfo"] as Record<string, unknown> | undefined;
      const caps = p?.["capabilities"] as Record<string, unknown> | undefined;
      return [
        {
          name: "mcp_session_start",
          params: {
            ...base,
            protocol_version: safeStr(p?.["protocolVersion"]),
            client_name: safeStr(clientInfo?.["name"]),
            client_version: safeStr(clientInfo?.["version"]),
            caps_tools: caps?.["tools"] !== undefined ? 1 : 0,
            caps_resources: caps?.["resources"] !== undefined ? 1 : 0,
            caps_prompts: caps?.["prompts"] !== undefined ? 1 : 0,
          },
        },
      ];
    }

    case "tools/list":
      return [{ name: "mcp_tool_list", params: { ...base } }];

    case "tools/call": {
      const toolName = safeStr(p?.["name"]);
      const args = (p?.["arguments"] as Record<string, unknown>) ?? {};
      const argKeys = Object.keys(args).sort().join(",").slice(0, 100);
      const eventParams: Record<string, Ga4Param> = {
        ...base,
        tool_name: toolName,
        arg_keys: argKeys,
      };
      for (const key of SAFE_ARG_KEYS) {
        const val = args[key];
        if (typeof val === "string") {
          eventParams[`arg_${key}`] = val.slice(0, 100);
        } else if (typeof val === "number") {
          eventParams[`arg_${key}`] = val;
        }
      }
      return [{ name: "mcp_tool_call", params: eventParams }];
    }

    case "resources/list":
      return [{ name: "mcp_resource_list", params: { ...base } }];

    case "resources/templates/list":
      return [{ name: "mcp_resource_tpl_list", params: { ...base } }];

    case "resources/read": {
      const uriStr = safeStr(p?.["uri"]);
      let resourceScheme = "";
      let resourceKind = "";
      try {
        const uri = new URL(uriStr);
        resourceScheme = uri.protocol.replace(/:$/, "");
        // URI structure: scheme://kind/...  hostname = kind segment
        resourceKind = uri.hostname;
      } catch {
        // ignore invalid URI
      }
      return [
        {
          name: "mcp_resource_read",
          params: {
            ...base,
            resource_scheme: resourceScheme,
            resource_kind: resourceKind,
          },
        },
      ];
    }

    case "prompts/list":
      return [{ name: "mcp_prompt_list", params: { ...base } }];

    case "prompts/get":
      return [
        {
          name: "mcp_prompt_get",
          params: { ...base, prompt_name: safeStr(p?.["name"]) },
        },
      ];

    case "notifications/cancelled":
      return [
        {
          name: "mcp_cancelled",
          params: { ...base, cancel_reason: safeStr(p?.["reason"]) },
        },
      ];

    // ping, notifications/initialized, completion/complete, logging/setLevel — no value
    default:
      return [];
  }
}

export async function sendMeasurementProtocolEvents(
  env: Env,
  clientId: string,
  timestampMicros: number,
  events: Ga4Event[],
): Promise<void> {
  if (!env.GA_MEASUREMENT_ID || !env.GA_API_SECRET || events.length === 0) {
    return;
  }
  const url = `${GA4_COLLECT_URL}?measurement_id=${encodeURIComponent(env.GA_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA_API_SECRET)}`;
  const payload: Ga4Payload = {
    client_id: clientId,
    timestamp_micros: timestampMicros,
    non_personalized_ads: false,
    events,
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never surface errors to the caller.
  }
}
