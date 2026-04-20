import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { loadManifest, type Manifest } from "./manifest.js";
import { buildSearchIndex, type SearchIndex } from "./search.js";
import {
  RESOURCE_NOT_FOUND_CODE,
  SERVER_NAME,
  SERVER_VERSION,
  createServer,
} from "./server.js";

async function startSession(manifest: Manifest, searchIndex: SearchIndex) {
  const server = createServer(manifest, searchIndex);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

describe("createServer (wired up with InMemoryTransport)", () => {
  let manifest: Manifest;
  let searchIndex: SearchIndex;
  let session: Awaited<ReturnType<typeof startSession>> | null = null;

  beforeAll(async () => {
    manifest = await loadManifest();
    searchIndex = await buildSearchIndex(manifest);
  });

  afterEach(async () => {
    if (session) {
      await session.close();
      session = null;
    }
  });

  it("advertises resources and tools capabilities with the expected server info", async () => {
    session = await startSession(manifest, searchIndex);
    const info = session.client.getServerVersion();
    expect(info).toMatchObject({ name: SERVER_NAME, version: SERVER_VERSION });
    expect(session.client.getServerCapabilities()).toMatchObject({
      resources: {},
      tools: {},
    });
  });

  it("lists the TOC and every chapter through resources/list", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.listResources();
    expect(response.resources.length).toBe(manifest.chapters.length + 1);
    expect(response.resources[0]).toMatchObject({ uri: "book-of-ohdsi://toc" });
  });

  it("returns the rendered TOC body through resources/read", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.readResource({
      uri: "book-of-ohdsi://toc",
    });
    expect(response.contents).toHaveLength(1);
    const entry = response.contents[0]!;
    expect(entry.uri).toBe("book-of-ohdsi://toc");
    expect(entry.mimeType).toBe("text/markdown");
    expect(entry.text).toContain(manifest.source.commit);
  });

  it("returns chapter body through resources/read", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.readResource({
      uri: "book-of-ohdsi://chapter/CommonDataModel",
    });
    expect(response.contents[0]!.text).toContain("The Common Data Model");
  });

  it("rejects unknown resource URIs with the spec-compliant -32002 code", async () => {
    session = await startSession(manifest, searchIndex);
    try {
      await session.client.readResource({
        uri: "book-of-ohdsi://chapter/DoesNotExist",
      });
      expect.unreachable("readResource should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      expect((error as McpError).code).toBe(RESOURCE_NOT_FOUND_CODE);
      expect((error as McpError).message).toContain("Resource not found");
    }
  });

  it("lists list_chapters, read_chapter, and search_book through tools/list", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.listTools();
    const names = response.tools.map((t) => t.name).sort();
    expect(names).toEqual(["list_chapters", "read_chapter", "search_book"]);
  });

  it("calls list_chapters and returns a markdown table", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "list_chapters",
      arguments: {},
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("book-of-ohdsi://chapter/CommonDataModel");
  });

  it("calls read_chapter and returns the chapter body with metadata header", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "read_chapter",
      arguments: { slug: "CommonDataModel" },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("# The Common Data Model");
    expect(content[0]!.text).toContain("slug: `CommonDataModel`");
  });

  it("returns isError=true when read_chapter receives an unknown slug", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "read_chapter",
      arguments: { slug: "DoesNotExist" },
    });
    expect(response.isError).toBe(true);
    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("Unknown chapter slug");
  });

  it("throws McpError(-32601) when an unknown tool is called", async () => {
    session = await startSession(manifest, searchIndex);
    try {
      await session.client.callTool({ name: "nonexistent", arguments: {} });
      expect.unreachable("callTool should have thrown for unknown tool");
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      expect((error as McpError).code).toBe(-32601);
      expect((error as McpError).message).toContain("nonexistent");
    }
  });

  it("propagates zod validation errors when tool arguments are malformed", async () => {
    session = await startSession(manifest, searchIndex);
    await expect(
      session.client.callTool({
        name: "read_chapter",
        arguments: {},
      }),
    ).rejects.toThrow();
  });

  it("calls search_book and returns ranked sections as markdown", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "search_book",
      arguments: { query: "common data model" },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toMatch(/results? for "common data model"/);
    expect(content[0]!.text).toContain("CommonDataModel");
  });

  it("returns a 'no results' message when search_book finds nothing", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "search_book",
      arguments: { query: "zzzzzzznonexistent" },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("No results");
  });

  it("respects the limit argument on search_book", async () => {
    session = await startSession(manifest, searchIndex);
    const response = await session.client.callTool({
      name: "search_book",
      arguments: { query: "data", limit: 2 },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    const matches = content[0]!.text.match(/^\d+\. \*\*/gm);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeLessThanOrEqual(2);
  });
});
