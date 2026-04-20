import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import {
  WEEKLY_DIGEST_CATEGORY_ID,
  WpDigestNotFoundError,
  WpRequestError,
  type ListDigestParams,
  type ListDigestResult,
  type WpClient,
  type WpPost,
} from "./client.js";
import { SERVER_NAME, SERVER_VERSION, createServer } from "./server.js";

function samplePost(overrides: Partial<WpPost> = {}): WpPost {
  return {
    id: 37328,
    date: "2026-04-13T22:25:54",
    date_gmt: "2026-04-13T22:25:54",
    modified: "2026-04-13T22:25:54",
    modified_gmt: "2026-04-13T22:25:54",
    slug: "weekly-ohdsi-digest-april-13-2026",
    status: "publish",
    type: "post",
    link: "https://www.ohdsi.org/weekly-ohdsi-digest-april-13-2026/",
    title: { rendered: "Weekly OHDSI Digest &#8211; April 13, 2026" },
    excerpt: { rendered: "<p>excerpt</p>" },
    content: { rendered: "<h2>body</h2>" },
    author: 9527,
    categories: [WEEKLY_DIGEST_CATEGORY_ID],
    tags: [],
    ...overrides,
  };
}

type ListCall = ListDigestParams;

interface StubClient extends WpClient {
  listCalls: ListCall[];
  retrieveCalls: number[];
}

function stubClient(overrides: Partial<WpClient> = {}): StubClient {
  const listCalls: ListCall[] = [];
  const retrieveCalls: number[] = [];
  return {
    listCalls,
    retrieveCalls,
    async listDigests(params): Promise<ListDigestResult> {
      listCalls.push(params);
      if (overrides.listDigests) return overrides.listDigests(params);
      return { posts: [samplePost()], total: 1, totalPages: 1 };
    },
    async retrieveDigest(id): Promise<WpPost> {
      retrieveCalls.push(id);
      if (overrides.retrieveDigest) return overrides.retrieveDigest(id);
      return samplePost({ id });
    },
  };
}

async function startSession(client: WpClient) {
  const server = createServer(client);
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

describe("ohdsi-weekly-digest MCP server", () => {
  let session: Awaited<ReturnType<typeof startSession>> | null = null;

  afterEach(async () => {
    if (session) {
      await session.close();
      session = null;
    }
  });

  it("advertises the expected server info and tools capability", async () => {
    session = await startSession(stubClient());
    expect(session.client.getServerVersion()).toMatchObject({
      name: SERVER_NAME,
      version: SERVER_VERSION,
    });
    expect(session.client.getServerCapabilities()).toMatchObject({
      tools: {},
    });
  });

  it("lists both digest tools via tools/list", async () => {
    session = await startSession(stubClient());
    const response = await session.client.listTools();
    const names = response.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "ohdsi-weekly-digest_digest_list",
      "ohdsi-weekly-digest_digest_retrieve",
    ]);
  });

  it("forwards list arguments and returns a markdown table", async () => {
    const stub = stubClient({
      async listDigests(params) {
        expect(params.page).toBe(2);
        expect(params.perPage).toBe(5);
        expect(params.after).toBe("2026-01-01T00:00:00");
        expect(params.before).toBe("2026-02-01T00:00:00");
        expect(params.search).toBe("vocab");
        return { posts: [samplePost()], total: 1, totalPages: 1 };
      },
    });
    session = await startSession(stub);

    const response = await session.client.callTool({
      name: "ohdsi-weekly-digest_digest_list",
      arguments: {
        page: 2,
        per_page: 5,
        after: "2026-01-01T00:00:00",
        before: "2026-02-01T00:00:00",
        search: "vocab",
      },
    });

    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("| 37328 | 2026-04-13 |");
  });

  it("returns the full post body via retrieve", async () => {
    session = await startSession(stubClient());
    const response = await session.client.callTool({
      name: "ohdsi-weekly-digest_digest_retrieve",
      arguments: { id: 37328 },
    });
    const content = response.content as Array<{ type: string; text: string }>;
    expect(response.isError).toBeFalsy();
    expect(content[0]!.text).toContain("# Weekly OHDSI Digest – April 13, 2026");
    expect(content[0]!.text).toContain("<h2>body</h2>");
  });

  it("returns isError=true when retrieve hits a missing id", async () => {
    const stub = stubClient({
      async retrieveDigest(id) {
        throw new WpDigestNotFoundError(id);
      },
    });
    session = await startSession(stub);

    const response = await session.client.callTool({
      name: "ohdsi-weekly-digest_digest_retrieve",
      arguments: { id: 99999 },
    });

    expect(response.isError).toBe(true);
    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("id=99999");
  });

  it("propagates unexpected errors from the client", async () => {
    const stub = stubClient({
      async retrieveDigest() {
        throw new WpRequestError(500, "https://example.test/x", "boom");
      },
    });
    session = await startSession(stub);

    const response = await session.client.callTool({
      name: "ohdsi-weekly-digest_digest_retrieve",
      arguments: { id: 1 },
    });
    // The MCP SDK translates thrown errors into isError=true tool responses.
    expect(response.isError).toBe(true);
  });

  it("rejects malformed arguments via zod validation", async () => {
    session = await startSession(stubClient());
    const response = await session.client.callTool({
      name: "ohdsi-weekly-digest_digest_retrieve",
      arguments: { id: "not-a-number" as unknown as number },
    });
    const r = response as { isError?: boolean };
    expect(r.isError).toBe(true);
  });
});
