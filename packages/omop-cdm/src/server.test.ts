import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildSearchIndex, type SearchIndex } from "./search.js";
import { SERVER_NAME, SERVER_VERSION, createServer } from "./server.js";

let sharedIndex: SearchIndex;

beforeAll(() => {
  sharedIndex = buildSearchIndex();
});

async function startSession() {
  const server = createServer(sharedIndex);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    mcpClient.connect(clientTransport),
  ]);
  return {
    client: mcpClient,
    async close() {
      await mcpClient.close();
      await server.close();
    },
  };
}

describe("omop-cdm MCP server", () => {
  let session: Awaited<ReturnType<typeof startSession>> | null = null;

  afterEach(async () => {
    if (session) {
      await session.close();
      session = null;
    }
  });

  it("advertises server info, tools, and resources", async () => {
    session = await startSession();
    expect(session.client.getServerVersion()).toMatchObject({
      name: SERVER_NAME,
      version: SERVER_VERSION,
    });
    expect(session.client.getServerCapabilities()).toMatchObject({
      tools: {},
      resources: {},
    });
  });

  it("lists every expected tool name", async () => {
    session = await startSession();
    const { tools } = await session.client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "omop-cdm_document_list",
      "omop-cdm_document_read",
      "omop-cdm_field_list",
      "omop-cdm_search",
      "omop-cdm_table_list",
    ]);
  });

  it("defaults omop-cdm_table_list to version 5.4", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_table_list",
      arguments: {},
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("# OMOP CDM v5.4 — tables");
    expect(content[0]!.text).toContain("`person`");
  });

  it("accepts an explicit version 5.3 / 6.0 for omop-cdm_table_list", async () => {
    session = await startSession();
    for (const version of ["5.3", "6.0"] as const) {
      const response = await session.client.callTool({
        name: "omop-cdm_table_list",
        arguments: { version },
      });
      const content = response.content as Array<{
        type: string;
        text: string;
      }>;
      expect(response.isError).toBeFalsy();
      expect(content[0]!.text).toContain(`# OMOP CDM v${version} — tables`);
    }
  });

  it("rejects an unsupported version via zod enum validation", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_table_list",
      arguments: { version: "5.5" },
    });
    expect(response.isError).toBe(true);
  });

  it("returns fields for a known table via omop-cdm_field_list", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_field_list",
      arguments: { table: "person" },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("`person` fields");
    expect(content[0]!.text).toContain("`person_id`");
  });

  it("surfaces UnknownTableError as isError=true", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_field_list",
      arguments: { table: "does-not-exist" },
    });
    expect(response.isError).toBe(true);
    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("Unknown OMOP CDM table");
  });

  it("lists and reads documents via the document tools, excluding CSV-mirror files", async () => {
    session = await startSession();
    const listResponse = await session.client.callTool({
      name: "omop-cdm_document_list",
      arguments: {},
    });
    const listContent = listResponse.content as Array<{
      type: string;
      text: string;
    }>;
    expect(listContent[0]!.text).toContain("`cdm54Changes`");
    expect(listContent[0]!.text).not.toMatch(/\|\s*`cdm54`\s*\|/);

    const readResponse = await session.client.callTool({
      name: "omop-cdm_document_read",
      arguments: { slug: "cdm54Changes" },
    });
    const readContent = readResponse.content as Array<{
      type: string;
      text: string;
    }>;
    expect(readResponse.isError).toBeFalsy();
    expect(readContent[0]!.text).toContain("- slug: `cdm54Changes`");
  });

  it("returns isError=true for an unknown document slug", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_document_read",
      arguments: { slug: "nope" },
    });
    expect(response.isError).toBe(true);
  });

  it("exposes the documents TOC as a static resource", async () => {
    session = await startSession();
    const response = await session.client.readResource({
      uri: "omop-cdm://documents",
    });
    const contents = response.contents as Array<{ uri: string; text: string }>;
    expect(contents[0]!.text).toContain("# OMOP CDM — R Markdown documents");
  });

  it("returns the raw Rmd body via the document ResourceTemplate", async () => {
    session = await startSession();
    const response = await session.client.readResource({
      uri: "omop-cdm://document/cdm54Changes",
    });
    const contents = response.contents as Array<{ uri: string; text: string }>;
    expect(contents[0]!.text.startsWith("---")).toBe(true);
  });

  it("throws a resource-not-found error for unknown document URIs", async () => {
    session = await startSession();
    await expect(
      session.client.readResource({ uri: "omop-cdm://document/does-not-exist" }),
    ).rejects.toThrow();
  });

  it("searches across Rmd and CSV content and returns markdown hits", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_search",
      arguments: { query: "gender_concept_id", limit: 5 },
    });
    expect(response.isError).toBeFalsy();
    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/result/);
    // We should find at least one CSV field row reference for gender_concept_id
    expect(content[0]!.text).toContain("gender_concept_id");
  });

  it("scopes search to a specific kind via `kinds`", async () => {
    session = await startSession();
    const response = await session.client.callTool({
      name: "omop-cdm_search",
      arguments: {
        query: "person",
        limit: 5,
        kinds: ["csv-table"],
      },
    });
    expect(response.isError).toBeFalsy();
    const content = response.content as Array<{ type: string; text: string }>;
    // csv-table category strings look like "v5.4 / table / person"
    expect(content[0]!.text).toMatch(/v\d\.\d \/ table \//);
    expect(content[0]!.text).not.toMatch(/v\d\.\d \/ field \//);
    expect(content[0]!.text).not.toMatch(/document \//);
  });
});
