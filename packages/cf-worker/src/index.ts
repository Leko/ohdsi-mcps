import { StreamableHTTPTransport } from "@hono/mcp";
import {
  createBookOhdsiServer,
  type McpServer,
} from "@ohdsi-mcps/book-of-ohdsi/bundle";
import { createOhdsiWeeklyDigestServer } from "@ohdsi-mcps/ohdsi-weekly-digest/bundle";
import { createOmopCdmServer } from "@ohdsi-mcps/omop-cdm/bundle";
import { Hono } from "hono";

import {
  deriveClientId,
  eventsFromJsonRpc,
  isAnalyticsEnabled,
  sendMeasurementProtocolEvents,
  type Env,
} from "./analytics.js";

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

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ ok: true }));

// Analytics middleware: fires after the MCP response is produced so
// duration_ms and httpStatus are available. Uses waitUntil() to avoid
// blocking the response.
app.use("/:slug/mcp", async (c, next) => {
  if (!isAnalyticsEnabled(c.env, c.req.raw)) {
    return next();
  }

  const startedAt = Date.now();
  const slug = c.req.param("slug");
  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    "unknown";
  const userAgent = c.req.header("user-agent") ?? "";
  const sessionId = c.req.header("mcp-session-id") ?? null;
  const timestampMicros = startedAt * 1000;

  // Clone the body before @hono/mcp consumes the request stream.
  let message: unknown;
  try {
    const text = await c.req.raw.clone().text();
    if (text) message = JSON.parse(text) as unknown;
  } catch {
    // non-JSON bodies (GET SSE requests) — no analytics event needed
  }

  await next();

  const durationMs = Date.now() - startedAt;
  const events = eventsFromJsonRpc(message, {
    serverSlug: slug,
    sessionId,
    durationMs,
    httpStatus: c.res.status,
  });

  if (events.length === 0) return;

  const salt = c.env.ANALYTICS_SALT ?? "";
  const clientIdPromise = deriveClientId(ip, userAgent, slug, salt);

  c.executionCtx.waitUntil(
    clientIdPromise.then((clientId) =>
      sendMeasurementProtocolEvents(c.env, clientId, timestampMicros, events),
    ),
  );
});

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
