# @ohdsi-mcps/cf-worker

Cloudflare Workers gateway that exposes every MCP server in this monorepo over HTTP, using path-based routing so all servers live under a single default `workers.dev` subdomain.

## Route design

```
GET  /                      Catalog (JSON): registered MCP servers with URLs
GET  /health                Liveness probe
ALL  /{slug}/mcp            Streamable HTTP endpoint for one MCP server
```

Currently registered:

| slug            | endpoint               | package                       |
| --------------- | ---------------------- | ----------------------------- |
| `book-of-ohdsi` | `/book-of-ohdsi/mcp`   | `@ohdsi-mcps/book-of-ohdsi`   |

Adding a new MCP is a one-line change in `src/index.ts` once the underlying package exports a `createHttpHandler()` from its `./http` subpath.

## Local development

```sh
npm install
npm run dev --workspace @ohdsi-mcps/cf-worker
# → http://127.0.0.1:8787/
```

Quick smoke test:

```sh
curl http://127.0.0.1:8787/
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/book-of-ohdsi/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Deploy

```sh
npm run deploy --workspace @ohdsi-mcps/cf-worker
```

Default URL after deploy: `https://ohdsi-mcps.<your-cf-subdomain>.workers.dev`.

## Handover to OHDSI

The worker name `ohdsi-mcps` is deliberately neutral so it can be transferred to the OHDSI organisation without rename pressure. After transfer the URL changes only in the subdomain (the account-level part), while every path stays identical. A later custom domain (e.g. `mcp.ohdsi.org`) would preserve the same `/{slug}/mcp` paths.
