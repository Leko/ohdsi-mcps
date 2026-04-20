import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type { McpServer };
import { loadManifest } from "./manifest.js";
import { buildSearchIndex } from "./search.js";
import { createServer } from "./server.js";

/**
 * Build a fully-configured MCP server for The Book of OHDSI, ready to
 * connect to any MCP transport (stdio, Web-Standards HTTP, `@hono/mcp`'s
 * Hono transport, ...). The underlying MiniSearch index is built once as
 * part of this factory so the caller can wire the returned server to
 * multiple transports or requests without reindexing.
 */
export async function createBookOhdsiServer(): Promise<McpServer> {
  const manifest = loadManifest();
  const searchIndex = await buildSearchIndex(manifest);
  return createServer(manifest, searchIndex);
}
