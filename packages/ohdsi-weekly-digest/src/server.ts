#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  PER_PAGE_DEFAULT,
  PER_PAGE_MAX,
  WpDigestNotFoundError,
  createWpClient,
  type WpClient,
} from "./client.js";
import { renderListDigest, renderRetrieveDigest } from "./tools.js";

export const SERVER_NAME = "ohdsi-weekly-digest";
export const SERVER_VERSION = "0.1.0";

const ISO_DATETIME_DESCRIPTION =
  "ISO 8601 datetime string (e.g. '2025-01-01T00:00:00').";

export function createServer(client: WpClient): McpServer {
  const mcp = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  mcp.registerTool(
    "ohdsi-weekly-digest_digest_list",
    {
      title: "List OHDSI Weekly Digest posts",
      description:
        "List OHDSI Weekly Digest posts from ohdsi.org (scoped to the Weekly Digest category), newest first. Returns a paginated markdown table of id, date, title, and link. Use `after`/`before` to window by publication date and `search` to narrow by keyword. Call ohdsi-weekly-digest_digest_retrieve with an id to fetch the full body.",
      inputSchema: {
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("1-based page number (default 1)."),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(PER_PAGE_MAX)
          .optional()
          .describe(
            `Number of posts per page (default ${PER_PAGE_DEFAULT}, max ${PER_PAGE_MAX}).`,
          ),
        after: z
          .string()
          .min(1)
          .optional()
          .describe(`Lower bound on publication date. ${ISO_DATETIME_DESCRIPTION}`),
        before: z
          .string()
          .min(1)
          .optional()
          .describe(`Upper bound on publication date. ${ISO_DATETIME_DESCRIPTION}`),
        search: z
          .string()
          .min(1)
          .optional()
          .describe("Free-text search string matched by the WordPress REST API."),
      },
    },
    async ({ page, per_page, after, before, search }) => {
      const params = {
        page,
        perPage: per_page,
        after,
        before,
        search,
      };
      const result = await client.listDigests(params);
      return {
        content: [{ type: "text", text: renderListDigest(result, params) }],
      };
    },
  );

  mcp.registerTool(
    "ohdsi-weekly-digest_digest_retrieve",
    {
      title: "Retrieve a single OHDSI Weekly Digest post",
      description:
        "Fetch a single OHDSI Weekly Digest post by its numeric WordPress post id. Returns a markdown header with id/date/slug/link followed by the post body (HTML as published by ohdsi.org). Use ohdsi-weekly-digest_digest_list first to discover ids.",
      inputSchema: {
        id: z
          .number()
          .int()
          .min(1)
          .describe(
            "Numeric WordPress post id returned by ohdsi-weekly-digest_digest_list.",
          ),
      },
    },
    async ({ id }) => {
      let post;
      try {
        post = await client.retrieveDigest(id);
      } catch (error) {
        if (!(error instanceof WpDigestNotFoundError)) throw error;
        return {
          content: [{ type: "text", text: error.message }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: renderRetrieveDigest(post) }],
      };
    },
  );

  return mcp;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

async function main(): Promise<void> {
  const client = createWpClient();
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (isMainModule()) {
  await main();
}
