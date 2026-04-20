import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type { McpServer };
import { buildSearchIndex } from "./search.js";
import { createServer } from "./server.js";

/**
 * Build a fully-configured MCP server for the OMOP Common Data Model
 * (versions 5.3, 5.4, 6.0), ready to connect to any MCP transport
 * (stdio, Web-Standards HTTP, `@hono/mcp`'s Hono transport, ...). All
 * table/field metadata and the companion R Markdown documents are
 * bundled via codegen, and the MiniSearch index is built once here so
 * the returned server can be wired to multiple transports without
 * reindexing.
 */
export async function createOmopCdmServer(): Promise<McpServer> {
  const index = buildSearchIndex();
  return createServer(index);
}
