# OHDSI MCPs

Hosted Model Context Protocol (MCP) servers for the [OHDSI](https://www.ohdsi.org/) ecosystem. One public HTTPS endpoint per server, with no local install required. Built for anyone in the OHDSI community who wants to plug OHDSI context into an MCP-capable AI assistant.

## Quick install

Endpoint pattern: `https://ohdsi-mcps.leko123.workers.dev/<slug>/mcp` — pick the slug of the server you want to connect from the [Available servers](#available-servers) table below (e.g. `book-of-ohdsi` for The Book of OHDSI).

- **claude.ai**: Settings → Connectors → Add custom connector, paste the endpoint.
- **Claude Code**: `claude mcp add --transport http <slug> <endpoint>`.

## Example prompts

Once the connector is installed, try:

**Book of OHDSI**

- "List every chapter of The Book of OHDSI."
- "Explain the OMOP Common Data Model visit_occurrence table based on The Book of OHDSI."
- "Which chapter discusses propensity-score calibration? Quote the relevant passage."

**OHDSI Weekly Digest**

- "What were the OHDSI community highlights in the last month?"
- "Summarise every OHDSI Weekly Digest posted after 2026-01-01."
- "Find the Weekly Digest entries that mention Phenotype Phebruary and quote what they said."

## Available servers

| Slug | Description | MCP endpoint |
| --- | --- | --- |
| `book-of-ohdsi` | The full text of [The Book of OHDSI](https://github.com/OHDSI/TheBookOfOhdsi) exposed as MCP resources | `https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp` |
| `ohdsi-weekly-digest` | The [OHDSI Weekly Digest](https://www.ohdsi.org/category/weekly-digest/) blog posts, fetched live from the ohdsi.org WordPress REST API | `https://ohdsi-mcps.leko123.workers.dev/ohdsi-weekly-digest/mcp` |

### Tools

| Server | Tool | Description |
| --- | --- | --- |
| `book-of-ohdsi` | `book-of-ohdsi.chapter.list` | List every chapter in reading order with its slug and resource URI. |
| `book-of-ohdsi` | `book-of-ohdsi.chapter.read` | Return the full R Markdown source of a single chapter by slug. |
| `book-of-ohdsi` | `book-of-ohdsi.chapter.search` | Full-text search over section-level chunks, powered by MiniSearch. |
| `ohdsi-weekly-digest` | `ohdsi-weekly-digest.digest.list` | Paginated listing of Weekly Digest posts, filtered by `page` / `per_page` / `after` / `before` / `search`. |
| `ohdsi-weekly-digest` | `ohdsi-weekly-digest.digest.retrieve` | Fetch the full body of a single Weekly Digest post by numeric id. |

## Verify from the terminal

```sh
curl -X POST https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## FAQ

### Is there a tool for searching vocabulary concepts?

Not in this repository. [`OHDSI/Hecate`](https://github.com/OHDSI/Hecate) is a semantic search engine for the OHDSI vocabulary and ships its own MCP server — check that out if you need concept lookup.

## Development

Contributor documentation — project layout, architecture, quality gate, and instructions for adding a new MCP server — lives in [`CLAUDE.md`](./CLAUDE.md). Each workspace also has its own README:

- [`packages/book-of-ohdsi/`](./packages/book-of-ohdsi/README.md) — MCP server for The Book of OHDSI.
- [`packages/ohdsi-weekly-digest/`](./packages/ohdsi-weekly-digest/README.md) — MCP server for the OHDSI Weekly Digest blog posts on ohdsi.org.
- [`packages/cf-worker/`](./packages/cf-worker/README.md) — Cloudflare Workers gateway that hosts every MCP server in this monorepo under a single `workers.dev` subdomain.

## License

Apache-2.0. Third-party attribution in [`packages/book-of-ohdsi/NOTICE`](./packages/book-of-ohdsi/NOTICE) (The Book of OHDSI content itself is CC0-1.0).
