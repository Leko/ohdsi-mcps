import { StreamableHTTPTransport } from "@hono/mcp";
import {
  createBookOhdsiServer,
  type McpServer,
} from "@ohdsi-mcps/book-of-ohdsi/bundle";
import { createOhdsiWeeklyDigestServer } from "@ohdsi-mcps/ohdsi-weekly-digest/bundle";
import { createOmopCdmServer } from "@ohdsi-mcps/omop-cdm/bundle";
import { Hono } from "hono";

type Mcp = {
  slug: string;
  createServer: () => Promise<McpServer>;
};

const MCP_REGISTRY: readonly Mcp[] = [
  {
    slug: "book-of-ohdsi",
    createServer: createBookOhdsiServer,
  },
  {
    slug: "ohdsi-weekly-digest",
    createServer: createOhdsiWeeklyDigestServer,
  },
  {
    slug: "omop-cdm",
    createServer: createOmopCdmServer,
  },
];

type McpSession = {
  serverPromise: Promise<McpServer>;
  transport: StreamableHTTPTransport;
};

const sessions = new Map<string, McpSession>();

function getSession(mcp: Mcp): McpSession {
  let session = sessions.get(mcp.slug);
  if (!session) {
    session = {
      serverPromise: mcp.createServer(),
      transport: new StreamableHTTPTransport(),
    };
    sessions.set(mcp.slug, session);
  }
  return session;
}

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

for (const mcp of MCP_REGISTRY) {
  app.all(`/${mcp.slug}/mcp`, async (c) => {
    const session = getSession(mcp);
    const server = await session.serverPromise;
    if (!server.isConnected()) {
      await server.connect(session.transport);
    }
    return session.transport.handleRequest(c);
  });
}

app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      message: `No MCP server is registered at ${new URL(c.req.url).pathname}.`,
      known_endpoints: [
        "/health",
        ...MCP_REGISTRY.map((mcp) => `/${mcp.slug}/mcp`),
      ],
    },
    404,
  ),
);

export default app;
