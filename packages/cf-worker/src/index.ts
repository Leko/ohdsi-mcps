import { createHttpHandler } from "@ohdsi-mcps/book-of-ohdsi/http";
import { Hono } from "hono";

type Mcp = {
  slug: string;
  title: string;
  description: string;
  createHandler: typeof createHttpHandler;
};

const MCP_REGISTRY: readonly Mcp[] = [
  {
    slug: "book-of-ohdsi",
    title: "The Book of OHDSI",
    description:
      "MCP server exposing The Book of OHDSI (OHDSI/TheBookOfOhdsi, CC0-1.0) as Resources, Tools (list_chapters, read_chapter, search_book), and full-text search.",
    createHandler: createHttpHandler,
  },
];

const handlerCache = new Map<string, Promise<(req: Request) => Promise<Response>>>();

function getHandler(mcp: Mcp) {
  let cached = handlerCache.get(mcp.slug);
  if (!cached) {
    cached = mcp.createHandler();
    handlerCache.set(mcp.slug, cached);
  }
  return cached;
}

const app = new Hono();

app.get("/", (c) => {
  const url = new URL(c.req.url);
  return c.json({
    name: "ohdsi-mcps",
    description:
      "Gateway for a monorepo of Model Context Protocol servers built for the OHDSI ecosystem.",
    repository: "https://github.com/Leko/ohdsi-mcps",
    servers: MCP_REGISTRY.map((mcp) => ({
      slug: mcp.slug,
      title: mcp.title,
      description: mcp.description,
      endpoint: new URL(`/${mcp.slug}/mcp`, url.origin).toString(),
    })),
  });
});

app.get("/health", (c) => c.json({ ok: true }));

for (const mcp of MCP_REGISTRY) {
  app.all(`/${mcp.slug}/mcp`, async (c) => {
    const handler = await getHandler(mcp);
    return handler(c.req.raw);
  });
}

app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      message: `No MCP server is registered at ${new URL(c.req.url).pathname}.`,
      known_endpoints: [
        "/",
        "/health",
        ...MCP_REGISTRY.map((mcp) => `/${mcp.slug}/mcp`),
      ],
    },
    404,
  ),
);

export default app;
