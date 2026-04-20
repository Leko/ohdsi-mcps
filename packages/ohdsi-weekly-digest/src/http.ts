import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createOhdsiWeeklyDigestServer } from "./bundle.js";

export type HttpHandler = (request: Request) => Promise<Response>;

/**
 * Runtime-agnostic Fetch-API handler for hosts that use the MCP SDK's
 * Web-Standards transport directly (Vercel Functions, Deno Deploy, bare
 * Cloudflare Workers without Hono, Bun, ...). For Hono-based deployments
 * prefer `createOhdsiWeeklyDigestServer()` with `@hono/mcp`'s
 * `StreamableHTTPTransport` so SSE streams flow through Hono's streaming
 * helpers.
 *
 * The MCP server is built once per host isolate, but a fresh transport +
 * connection is established per request — the SDK's stateless
 * `WebStandardStreamableHTTPServerTransport` explicitly forbids reuse.
 */
export async function createHttpHandler(): Promise<HttpHandler> {
  const server = await createOhdsiWeeklyDigestServer();
  return async (request) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await transport.close();
    }
  };
}
