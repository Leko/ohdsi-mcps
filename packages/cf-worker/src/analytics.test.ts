import { describe, expect, it } from "vitest";
import {
  deriveClientId,
  eventsFromJsonRpc,
  isAnalyticsEnabled,
  type Env,
  type RequestContext,
} from "./analytics.js";

const baseCtx: RequestContext = {
  serverSlug: "book-of-ohdsi",
  sessionId: null,
  durationMs: 42,
  httpStatus: 200,
};

const fullEnv: Env = {
  GA_MEASUREMENT_ID: "G-TEST123",
  GA_API_SECRET: "secret",
  ANALYTICS_ENABLED: "true",
};

// ---------------------------------------------------------------------------
// isAnalyticsEnabled
// ---------------------------------------------------------------------------

describe("isAnalyticsEnabled", () => {
  function makeRequest(
    url = "https://example.com/book-of-ohdsi/mcp",
    headers: Record<string, string> = {},
  ): Request {
    return new Request(url, { headers });
  }

  it("returns true when credentials are present and no opt-out signals", () => {
    expect(isAnalyticsEnabled(fullEnv, makeRequest())).toBe(true);
  });

  it("returns false when ANALYTICS_ENABLED is 'false'", () => {
    const env: Env = { ...fullEnv, ANALYTICS_ENABLED: "false" };
    expect(isAnalyticsEnabled(env, makeRequest())).toBe(false);
  });

  it("returns false when GA_MEASUREMENT_ID is missing", () => {
    const env: Env = { ...fullEnv, GA_MEASUREMENT_ID: undefined };
    expect(isAnalyticsEnabled(env, makeRequest())).toBe(false);
  });

  it("returns false when GA_API_SECRET is missing", () => {
    const env: Env = { ...fullEnv, GA_API_SECRET: undefined };
    expect(isAnalyticsEnabled(env, makeRequest())).toBe(false);
  });

  it("returns false when DNT header is '1'", () => {
    expect(isAnalyticsEnabled(fullEnv, makeRequest(undefined, { dnt: "1" }))).toBe(false);
  });

  it("returns false when Sec-GPC header is '1'", () => {
    expect(isAnalyticsEnabled(fullEnv, makeRequest(undefined, { "sec-gpc": "1" }))).toBe(false);
  });

  it("returns false when ?analytics=0 query param is set", () => {
    expect(
      isAnalyticsEnabled(fullEnv, makeRequest("https://example.com/mcp?analytics=0")),
    ).toBe(false);
  });

  it("returns true when DNT header is not '1'", () => {
    expect(isAnalyticsEnabled(fullEnv, makeRequest(undefined, { dnt: "0" }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveClientId
// ---------------------------------------------------------------------------

describe("deriveClientId", () => {
  it("returns a 32-char lowercase hex string", async () => {
    const id = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "salt");
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic for the same inputs", async () => {
    const id1 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "salt");
    const id2 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "salt");
    expect(id1).toBe(id2);
  });

  it("differs when IP changes", async () => {
    const id1 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "salt");
    const id2 = await deriveClientId("5.6.7.8", "Claude/1.0", "book-of-ohdsi", "salt");
    expect(id1).not.toBe(id2);
  });

  it("differs when salt changes", async () => {
    const id1 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "saltA");
    const id2 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "saltB");
    expect(id1).not.toBe(id2);
  });

  it("differs when server slug changes", async () => {
    const id1 = await deriveClientId("1.2.3.4", "Claude/1.0", "book-of-ohdsi", "salt");
    const id2 = await deriveClientId("1.2.3.4", "Claude/1.0", "omop-cdm", "salt");
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — non-MCP input
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — non-MCP input", () => {
  it("returns [] for non-object input", () => {
    expect(eventsFromJsonRpc(null, baseCtx)).toEqual([]);
    expect(eventsFromJsonRpc("string", baseCtx)).toEqual([]);
    expect(eventsFromJsonRpc(42, baseCtx)).toEqual([]);
  });

  it("returns [] for object missing jsonrpc field", () => {
    expect(eventsFromJsonRpc({ method: "tools/call" }, baseCtx)).toEqual([]);
  });

  it("returns [] for object with wrong jsonrpc version", () => {
    expect(eventsFromJsonRpc({ jsonrpc: "1.0", method: "tools/call" }, baseCtx)).toEqual([]);
  });

  it("returns [] for array (batch) input", () => {
    expect(
      eventsFromJsonRpc(
        [{ jsonrpc: "2.0", method: "tools/call", id: 1, params: {} }],
        baseCtx,
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — skipped methods
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — skipped methods", () => {
  it("returns [] for ping", () => {
    expect(eventsFromJsonRpc({ jsonrpc: "2.0", method: "ping" }, baseCtx)).toEqual([]);
  });

  it("returns [] for notifications/initialized", () => {
    expect(
      eventsFromJsonRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, baseCtx),
    ).toEqual([]);
  });

  it("returns [] for unknown method", () => {
    expect(
      eventsFromJsonRpc({ jsonrpc: "2.0", method: "unknown/method" }, baseCtx),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — initialize
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — initialize", () => {
  const msg = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "claude-ai", version: "1.2.3" },
      capabilities: { tools: {}, resources: {} },
    },
  };

  it("returns mcp_session_start event", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.name).toBe("mcp_session_start");
  });

  it("includes client_name, client_version, protocol_version", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["client_name"]).toBe("claude-ai");
    expect(event?.params["client_version"]).toBe("1.2.3");
    expect(event?.params["protocol_version"]).toBe("2025-06-18");
  });

  it("sets caps_tools and caps_resources to 1, caps_prompts to 0", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["caps_tools"]).toBe(1);
    expect(event?.params["caps_resources"]).toBe(1);
    expect(event?.params["caps_prompts"]).toBe(0);
  });

  it("includes base params (server_slug, duration_ms, is_error)", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["server_slug"]).toBe("book-of-ohdsi");
    expect(event?.params["duration_ms"]).toBe(42);
    expect(event?.params["is_error"]).toBe(0);
  });

  it("sets is_error to 1 when httpStatus is 500", () => {
    const [event] = eventsFromJsonRpc(msg, { ...baseCtx, httpStatus: 500 });
    expect(event?.params["is_error"]).toBe(1);
  });

  it("includes session_id when provided", () => {
    const [event] = eventsFromJsonRpc(msg, { ...baseCtx, sessionId: "sess-abc" });
    expect(event?.params["session_id"]).toBe("sess-abc");
  });

  it("omits session_id when null", () => {
    const [event] = eventsFromJsonRpc(msg, { ...baseCtx, sessionId: null });
    expect(Object.keys(event?.params ?? {})).not.toContain("session_id");
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — tools/list
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — tools/list", () => {
  it("returns mcp_tool_list event", () => {
    const msg = { jsonrpc: "2.0" as const, id: 1, method: "tools/list" };
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.name).toBe("mcp_tool_list");
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — tools/call
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — tools/call", () => {
  const msg = {
    jsonrpc: "2.0" as const,
    id: 2,
    method: "tools/call",
    params: {
      name: "book-of-ohdsi_chapter_read",
      arguments: {
        slug: "CommonDataModel",
        query: "some free text",
      },
    },
  };

  it("returns mcp_tool_call event", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.name).toBe("mcp_tool_call");
  });

  it("includes tool_name", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["tool_name"]).toBe("book-of-ohdsi_chapter_read");
  });

  it("includes sorted arg_keys", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["arg_keys"]).toBe("query,slug");
  });

  it("includes safe arg value for slug", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["arg_slug"]).toBe("CommonDataModel");
  });

  it("does NOT include arg value for free-text query", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(Object.keys(event?.params ?? {})).not.toContain("arg_query");
  });

  it("includes safe arg value for version when present", () => {
    const msgWithVersion = {
      ...msg,
      params: { name: "omop-cdm_table_list", arguments: { version: "5.4" } },
    };
    const [event] = eventsFromJsonRpc(msgWithVersion, baseCtx);
    expect(event?.params["arg_version"]).toBe("5.4");
  });

  it("handles empty arguments", () => {
    const msgNoArgs = {
      ...msg,
      params: { name: "book-of-ohdsi_chapter_list", arguments: {} },
    };
    const [event] = eventsFromJsonRpc(msgNoArgs, baseCtx);
    expect(event?.params["arg_keys"]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — resources/read
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — resources/read", () => {
  const msg = {
    jsonrpc: "2.0" as const,
    id: 3,
    method: "resources/read",
    params: { uri: "book-of-ohdsi://chapter/CommonDataModel" },
  };

  it("returns mcp_resource_read event", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.name).toBe("mcp_resource_read");
  });

  it("extracts resource_scheme from URI", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["resource_scheme"]).toBe("book-of-ohdsi");
  });

  it("extracts resource_kind (hostname) from URI", () => {
    const [event] = eventsFromJsonRpc(msg, baseCtx);
    expect(event?.params["resource_kind"]).toBe("chapter");
  });

  it("handles toc URI", () => {
    const tocMsg = { ...msg, params: { uri: "book-of-ohdsi://toc" } };
    const [event] = eventsFromJsonRpc(tocMsg, baseCtx);
    expect(event?.params["resource_kind"]).toBe("toc");
  });

  it("handles invalid URI gracefully", () => {
    const badMsg = { ...msg, params: { uri: "not-a-uri" } };
    const [event] = eventsFromJsonRpc(badMsg, baseCtx);
    expect(event?.name).toBe("mcp_resource_read");
    expect(event?.params["resource_scheme"]).toBe("");
    expect(event?.params["resource_kind"]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — other methods
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — other methods", () => {
  it("returns mcp_resource_list for resources/list", () => {
    const [event] = eventsFromJsonRpc(
      { jsonrpc: "2.0" as const, method: "resources/list" },
      baseCtx,
    );
    expect(event?.name).toBe("mcp_resource_list");
  });

  it("returns mcp_resource_tpl_list for resources/templates/list", () => {
    const [event] = eventsFromJsonRpc(
      { jsonrpc: "2.0" as const, method: "resources/templates/list" },
      baseCtx,
    );
    expect(event?.name).toBe("mcp_resource_tpl_list");
  });

  it("returns mcp_prompt_list for prompts/list", () => {
    const [event] = eventsFromJsonRpc(
      { jsonrpc: "2.0" as const, method: "prompts/list" },
      baseCtx,
    );
    expect(event?.name).toBe("mcp_prompt_list");
  });

  it("returns mcp_prompt_get with prompt_name for prompts/get", () => {
    const [event] = eventsFromJsonRpc(
      {
        jsonrpc: "2.0" as const,
        method: "prompts/get",
        params: { name: "my-prompt" },
      },
      baseCtx,
    );
    expect(event?.name).toBe("mcp_prompt_get");
    expect(event?.params["prompt_name"]).toBe("my-prompt");
  });

  it("returns mcp_cancelled with cancel_reason for notifications/cancelled", () => {
    const [event] = eventsFromJsonRpc(
      {
        jsonrpc: "2.0" as const,
        method: "notifications/cancelled",
        params: { requestId: 1, reason: "timeout" },
      },
      baseCtx,
    );
    expect(event?.name).toBe("mcp_cancelled");
    expect(event?.params["cancel_reason"]).toBe("timeout");
  });
});

// ---------------------------------------------------------------------------
// eventsFromJsonRpc — string truncation
// ---------------------------------------------------------------------------

describe("eventsFromJsonRpc — string truncation", () => {
  it("truncates tool_name to 100 chars", () => {
    const longName = "t".repeat(200);
    const [event] = eventsFromJsonRpc(
      {
        jsonrpc: "2.0" as const,
        method: "tools/call",
        params: { name: longName, arguments: {} },
      },
      baseCtx,
    );
    expect((event?.params["tool_name"] as string).length).toBe(100);
  });
});
