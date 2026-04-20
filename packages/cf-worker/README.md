# @ohdsi-mcps/cf-worker

Cloudflare Workers gateway that exposes every MCP server in this monorepo over HTTP, using path-based routing so all servers live under a single default `workers.dev` subdomain.

## Route design

```
GET  /health                Liveness probe
ALL  /{slug}/mcp            Streamable HTTP endpoint for one MCP server
```

Currently registered:

| slug                  | endpoint                     | package                             |
| --------------------- | ---------------------------- | ----------------------------------- |
| `book-of-ohdsi`       | `/book-of-ohdsi/mcp`         | `@ohdsi-mcps/book-of-ohdsi`         |
| `ohdsi-weekly-digest` | `/ohdsi-weekly-digest/mcp`   | `@ohdsi-mcps/ohdsi-weekly-digest`   |
| `omop-cdm`            | `/omop-cdm/mcp`              | `@ohdsi-mcps/omop-cdm`              |

Adding a new MCP is a one-line change in `src/index.ts` once the underlying package exports `createXxxServer(): Promise<McpServer>` from its `./bundle` subpath.

## Local development

```sh
npm install
npm run dev --workspace @ohdsi-mcps/cf-worker
# → http://127.0.0.1:8787/
```

Quick smoke test:

```sh
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

### Preview a change without touching production

Uploading a *version* gives you a dedicated preview URL that is not
wired into production traffic. No separate worker is created, so the
main `ohdsi-mcps.<sub>.workers.dev` endpoint keeps serving the last
production version.

```sh
# Upload the current source as a preview version and print its URL.
npm run deploy:preview --workspace @ohdsi-mcps/cf-worker
# Output contains a URL like
#   https://<version-id>-ohdsi-mcps.<sub>.workers.dev

# Hit the preview URL directly to validate e.g. the new omop-cdm tools:
curl -X POST https://<version-id>-ohdsi-mcps.<sub>.workers.dev/omop-cdm/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

When you are happy with the preview, promote it to production:

```sh
npm run deploy:promote --workspace @ohdsi-mcps/cf-worker
# wrangler versions deploy — pick the version to receive 100 % traffic
```

## Handover to OHDSI

The worker name `ohdsi-mcps` is deliberately neutral so it can be transferred to the OHDSI organisation without rename pressure. After transfer the URL changes only in the subdomain (the account-level part), while every path stays identical. A later custom domain (e.g. `mcp.ohdsi.org`) would preserve the same `/{slug}/mcp` paths.
