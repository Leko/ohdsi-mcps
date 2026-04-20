import { beforeAll, describe, expect, it } from "vitest";
import { createHttpHandler, type HttpHandler } from "./http.js";

const MCP_ENDPOINT = "https://example.test/ohdsi-weekly-digest/mcp";

const INITIALIZE_BODY = {
  jsonrpc: "2.0" as const,
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "http-test", version: "0.0.0" },
  },
};

function postMcp(body: unknown): Request {
  return new Request(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

describe("createHttpHandler (Fetch API transport)", () => {
  let handler: HttpHandler;

  beforeAll(async () => {
    handler = await createHttpHandler();
  });

  it("responds to an initialize request with server info and capabilities", async () => {
    const response = await handler(postMcp(INITIALIZE_BODY));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { serverInfo: { name: string }; capabilities: unknown };
      id: number;
    };
    expect(payload.id).toBe(1);
    expect(payload.result.serverInfo.name).toBe("ohdsi-weekly-digest");
    expect(payload.result.capabilities).toMatchObject({ tools: {} });
  });

  it("answers tools/list after initialization", async () => {
    const response = await handler(
      postMcp({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { tools: Array<{ name: string }> };
    };
    const names = payload.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "ohdsi-weekly-digest.digest.list",
      "ohdsi-weekly-digest.digest.retrieve",
    ]);
  });

  it("rejects non-POST / non-GET verbs with 4xx", async () => {
    const response = await handler(
      new Request(MCP_ENDPOINT, { method: "PATCH" }),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
