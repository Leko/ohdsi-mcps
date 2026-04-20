import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type { McpServer };
import { createWpClient, type WpClientOptions } from "./client.js";
import { createServer } from "./server.js";

/**
 * Build a fully-configured MCP server for the OHDSI Weekly Digest,
 * ready to connect to any MCP transport (stdio, Web-Standards HTTP,
 * `@hono/mcp`'s Hono transport, ...). Every call creates a fresh
 * `McpServer` bound to the provided (or default) WordPress REST API
 * client so the returned instance can be wired to a transport by the
 * caller.
 */
export async function createOhdsiWeeklyDigestServer(
  options?: WpClientOptions,
): Promise<McpServer> {
  const client = createWpClient(options);
  return createServer(client);
}
