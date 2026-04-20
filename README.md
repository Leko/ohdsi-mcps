# OHDSI MCPs

Hosted Model Context Protocol (MCP) servers for the [OHDSI](https://www.ohdsi.org/) ecosystem. One public HTTPS endpoint per server, with no local install required. Built for anyone in the OHDSI community who wants to plug OHDSI context into an MCP-capable AI assistant.

## Available servers

| Slug              | Description                                                                                              | MCP endpoint                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `book-of-ohdsi`   | The full text of [The Book of OHDSI](https://github.com/OHDSI/TheBookOfOhdsi) exposed as MCP resources + tools (`list_chapters`, `read_chapter`, `search_book` full-text search over section-level chunks). | `https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp`      |

Root catalog (JSON): https://ohdsi-mcps.leko123.workers.dev/
Liveness: https://ohdsi-mcps.leko123.workers.dev/health

## Quick install

### Cursor

[![Add book-of-ohdsi to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=book-of-ohdsi&config=eyJ1cmwiOiJodHRwczovL29oZHNpLW1jcHMubGVrbzEyMy53b3JrZXJzLmRldi9ib29rLW9mLW9oZHNpL21jcCJ9)

Click the badge to import the configuration. Cursor reads the base64-encoded JSON in the deeplink URL (`cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64>`).

### Claude.ai Web (Pro / Team / Enterprise / Max)

1. **Settings → Connectors → Add custom connector**
2. **Name**: `The Book of OHDSI`
3. **URL**: `https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp`
4. Save. The `list_chapters`, `read_chapter`, and `search_book` tools appear in any new conversation.

### Claude Desktop

Edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```jsonc
{
  "mcpServers": {
    "book-of-ohdsi": {
      "type": "http",
      "url": "https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp"
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

```sh
claude mcp add --transport http book-of-ohdsi \
  https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp
```

Or check the same block into a project-level `.mcp.json` at the repository root:

```jsonc
{
  "mcpServers": {
    "book-of-ohdsi": {
      "type": "http",
      "url": "https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp"
    }
  }
}
```

## Example prompts

Once the connector is installed, try:

- "List every chapter of The Book of OHDSI."
- "Explain the OMOP Common Data Model visit_occurrence table based on The Book of OHDSI."
- "Which chapter discusses propensity-score calibration? Quote the relevant passage."

Under the hood the assistant calls `list_chapters` / `read_chapter` / `search_book` against the hosted server.

## Verify from the terminal

```sh
curl https://ohdsi-mcps.leko123.workers.dev/
curl https://ohdsi-mcps.leko123.workers.dev/health

curl -X POST https://ohdsi-mcps.leko123.workers.dev/book-of-ohdsi/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Development

Contributor documentation — project layout, architecture, quality gate, and instructions for adding a new MCP server — lives in [`CLAUDE.md`](./CLAUDE.md). Each workspace also has its own README:

- [`packages/book-of-ohdsi/`](./packages/book-of-ohdsi/README.md) — MCP server for The Book of OHDSI.
- [`packages/cf-worker/`](./packages/cf-worker/README.md) — Cloudflare Workers gateway that hosts every MCP server in this monorepo under a single `workers.dev` subdomain.

## License

Apache-2.0. Third-party attribution in [`packages/book-of-ohdsi/NOTICE`](./packages/book-of-ohdsi/NOTICE) (The Book of OHDSI content itself is CC0-1.0).
