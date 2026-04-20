#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { Manifest } from "./manifest.js";
import { loadManifest } from "./manifest.js";
import { listResources, readResource } from "./resources.js";
import {
  LIST_CHAPTERS_TOOL_NAME,
  READ_CHAPTER_TOOL_NAME,
  UnknownChapterError,
  callReadChapter,
  listChaptersTool,
  parseListChaptersInput,
  parseReadChapterInput,
  readChapterTool,
  renderListChapters,
} from "./tools.js";

export const RESOURCE_NOT_FOUND_CODE = -32002;
export const SERVER_NAME = "book-of-ohdsi";
export const SERVER_VERSION = "0.1.0";

export function createServer(manifest: Manifest): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { resources: {}, tools: {} } },
  );

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: listResources(manifest),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const result = await readResource(manifest, uri);
    if (!result) {
      throw new McpError(
        RESOURCE_NOT_FOUND_CODE,
        `Resource not found: ${uri}`,
        { uri },
      );
    }
    return { contents: [result] };
  });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [listChaptersTool, readChapterTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === LIST_CHAPTERS_TOOL_NAME) {
      parseListChaptersInput(args);
      return {
        content: [{ type: "text", text: renderListChapters(manifest) }],
      };
    }
    if (name === READ_CHAPTER_TOOL_NAME) {
      const input = parseReadChapterInput(args);
      try {
        const text = await callReadChapter(manifest, input);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (error instanceof UnknownChapterError) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
        throw error;
      }
    }
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  });

  return server;
}

export function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

async function main(): Promise<void> {
  const manifest = await loadManifest();
  const server = createServer(manifest);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (isMainModule()) {
  await main();
}
