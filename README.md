# OHDSI MCPs

Hosted Model Context Protocol (MCP) servers for the [OHDSI](https://www.ohdsi.org/) ecosystem. One public HTTPS endpoint per server, with no local install required. Built for anyone in the OHDSI community who wants to plug OHDSI context into an MCP-capable AI assistant.

## Available servers

| Slug            | Description                                                                                            |                                                                                           | MCP endpoint                                               |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `book-of-ohdsi` | The full text of [The Book of OHDSI](https://github.com/OHDSI/TheBookOfOhdsi) exposed as MCP resources | `book-of-ohdsi.chapter.list`, `book-of-ohdsi.chapter.read`, `book-of-ohdsi.chapter.search` (full-text search over section-level chunks) | `https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp` |
| `ohdsi-weekly-digest` | The [OHDSI Weekly Digest](https://www.ohdsi.org/category/weekly-digest/) blog posts, fetched live from the ohdsi.org WordPress REST API | `ohdsi-weekly-digest.digest.list` (paginated listing with `page`/`per_page`/`after`/`before`/`search` filters), `ohdsi-weekly-digest.digest.retrieve` (single post by id) | `https://ohdsi-mcps.leko123.workers.dev/ohdsi-weekly-digest/mcp` |

## Quick install

Endpoint pattern: `https://ohdsi-mcps.leko123.workers.dev/<slug>/mcp` — pick the slug of the server you want to connect from the table above (e.g. `book-of-ohdsi` for The Book of OHDSI).

- **claude.ai**: Settings → Connectors → Add custom connector, paste the endpoint.
- **Claude Code**: `claude mcp add --transport http <slug> <endpoint>`.

## Example prompts

Once the connector is installed, try:

- "List every chapter of The Book of OHDSI."
- "Explain the OMOP Common Data Model visit_occurrence table based on The Book of OHDSI."
- "Which chapter discusses propensity-score calibration? Quote the relevant passage."

Under the hood the assistant calls `book-of-ohdsi.chapter.list` / `book-of-ohdsi.chapter.read` / `book-of-ohdsi.chapter.search` against the hosted server.

## Verify from the terminal

```sh
curl -X POST https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Development

Contributor documentation — project layout, architecture, quality gate, and instructions for adding a new MCP server — lives in [`CLAUDE.md`](./CLAUDE.md). Each workspace also has its own README:

- [`packages/book-of-ohdsi/`](./packages/book-of-ohdsi/README.md) — MCP server for The Book of OHDSI.
- [`packages/ohdsi-weekly-digest/`](./packages/ohdsi-weekly-digest/README.md) — MCP server for the OHDSI Weekly Digest blog posts on ohdsi.org.
- [`packages/cf-worker/`](./packages/cf-worker/README.md) — Cloudflare Workers gateway that hosts every MCP server in this monorepo under a single `workers.dev` subdomain.

## License

Apache-2.0. Third-party attribution in [`packages/book-of-ohdsi/NOTICE`](./packages/book-of-ohdsi/NOTICE) (The Book of OHDSI content itself is CC0-1.0).
