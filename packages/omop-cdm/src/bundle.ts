import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type { McpServer };
import { createServer } from "./server.js";

/**
 * Build a fully-configured MCP server for the OMOP Common Data Model
 * (versions 5.3, 5.4, 6.0), ready to connect to any MCP transport
 * (stdio, Web-Standards HTTP, `@hono/mcp`'s Hono transport, ...). All
 * table and field metadata is bundled into the package via codegen, so
 * this factory performs no I/O and runs on Cloudflare Workers, Vercel
 * Functions, Deno, Bun, or Node without a compatibility shim.
 */
export async function createOmopCdmServer(): Promise<McpServer> {
  return createServer();
}
