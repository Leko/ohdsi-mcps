# `@ohdsi-mcps/ohdsi-weekly-digest`

Model Context Protocol server that exposes the [OHDSI Weekly Digest](https://www.ohdsi.org/category/weekly-digest/) blog posts via the `ohdsi.org` WordPress REST API.

The server calls `GET https://www.ohdsi.org/wp-json/wp/v2/posts?categories=1&...` at request time — nothing is bundled or vendored, so each tool call returns the live state of the Weekly Digest feed.

## Tools

| Name | Arguments | Description |
| --- | --- | --- |
| `ohdsi-weekly-digest_digest_list` | `page?`, `per_page?`, `after?`, `before?`, `search?` | Paginated listing of Weekly Digest posts (newest first) as a markdown table of `id`, `date`, `title`, `link`. |
| `ohdsi-weekly-digest_digest_retrieve` | `id` | Full body of a single Weekly Digest post, identified by the numeric WordPress post id returned by `ohdsi-weekly-digest_digest_list`. |

No MCP resources are exposed — the content is inherently dynamic, so reading it through tools (with pagination and filter arguments) matches usage patterns better than a static URI list.

## Local debugging

```sh
# Build once (emits dist/)
npm run build --workspace @ohdsi-mcps/ohdsi-weekly-digest

# Stdio MCP server, e.g. for wiring into Claude Desktop
npm run dev --workspace @ohdsi-mcps/ohdsi-weekly-digest

# Unit tests
npm run test --workspace @ohdsi-mcps/ohdsi-weekly-digest
```

Production hosting lives in [`@ohdsi-mcps/cf-worker`](../cf-worker), which mounts this server at `/ohdsi-weekly-digest/mcp`.
