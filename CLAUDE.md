# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monorepo of Model Context Protocol (MCP) servers for the OHDSI ecosystem. It ships two kinds of packages:

- **MCP servers** under `packages/<slug>/` — one package per MCP (e.g. `@ohdsi-mcps/book-of-ohdsi`). Each server is Hono-agnostic and only depends on `@modelcontextprotocol/sdk`. Every server package exports a `create*Server(): Promise<McpServer>` factory from its `./bundle` subpath.
- **Transport hosts** that consume those factories — currently `@ohdsi-mcps/cf-worker`, a Cloudflare Workers gateway built with Hono + `@hono/mcp`. Adding a new host (Vercel Functions, Deno Deploy, ...) does not touch the MCP packages.

The target deployment is Cloudflare Workers at `https://ohdsi-mcps.<cf-subdomain>.workers.dev/<slug>/mcp`, because OHDSI users are mostly non-JS researchers and should not need Node.js or npx. Stdio entry points exist per package for local debugging, not as the primary distribution.

## Architecture

```
packages/book-of-ohdsi/          MCP server
├── scripts/generate-content.ts  Codegen: reads vendor/ submodule → src/generated/content.ts
├── vendor/TheBookOfOhdsi/       git submodule; source of truth, never read at runtime
├── src/generated/content.ts     Bundled chapter bodies + SOURCE_COMMIT (committed, regenerated)
├── src/manifest.ts              Sync loaders: loadManifest / loadChapterBody from generated/
├── src/chunker.ts               remark-parse AST walker that splits Rmd into SearchChunks
├── src/search.ts                MiniSearch index factory (title boosted, prefix + fuzzy)
├── src/resources.ts             URI helpers (book-of-ohdsi://toc, chapter/{slug}) + renderToc
├── src/tools.ts                 Pure helpers: renderListChapters, callReadChapter, callSearchBook
├── src/server.ts                createServer(manifest, index) → McpServer with tools/resources
├── src/bundle.ts                createBookOhdsiServer(): Promise<McpServer>  ← main integration point
└── src/http.ts                  Runtime-agnostic Fetch handler (WebStandardStreamableHTTPServerTransport)

packages/cf-worker/              Deployment host
├── wrangler.jsonc               name = "ohdsi-mcps", nodejs_compat
└── src/index.ts                 Hono app + @hono/mcp StreamableHTTPTransport, MCP_REGISTRY drives routing
```

Key flows:

- **Content lifecycle.** `vendor/TheBookOfOhdsi` (git submodule, CC0-1.0) is the upstream snapshot. `scripts/generate-content.ts` reads it once at build time and emits `src/generated/content.ts` with `SOURCE_COMMIT`, `RMD_FILES`, and `CHAPTER_BODIES`. Runtime code never touches `fs` or `git`, so the bundle runs on Cloudflare Workers, Vercel Functions, Deno, Bun, or Node stdio without a compatibility shim.
- **Server composition.** `createServer(manifest, searchIndex)` registers resources (`toc` static URI + `chapter` `ResourceTemplate`) and tools (`list_chapters`, `read_chapter`, `search_book`) on an `McpServer`. `createBookOhdsiServer()` in `bundle.ts` is the single entry point hosts consume — it calls `loadManifest()` (sync) and `buildSearchIndex()` (builds MiniSearch from remark-chunked sections) then returns the connected-ready server.
- **Gateway routing.** `packages/cf-worker/src/index.ts` holds a `MCP_REGISTRY` array. For each entry, a single `StreamableHTTPTransport` is memoised per slug and the underlying `McpServer` is connected lazily on first request (`server.isConnected()` guard, per the `@hono/mcp` docs). `GET /` returns a JSON catalog; `GET /health` is a liveness probe.
- **Error surface.** Unknown chapter URIs throw `McpError(-32002, …)` from inside the `ResourceTemplate` handler so the response matches the MCP spec's "Resource not found" code. Tool argument validation is handled by `McpServer` via the zod shapes passed to `registerTool`.

## Commands

```sh
# Install workspaces (one-time; also needed after pulling submodule updates)
npm install
git submodule update --init --recursive

# Quality gate (see the Quality gate section below)
npm run knip                # dead-code / unused-export detection
npm run build               # tsc typecheck + dist emit for every workspace
npm run test                # full vitest suite
npm run test:coverage --workspace @ohdsi-mcps/book-of-ohdsi

# Running a single vitest file or pattern
npm run test --workspace @ohdsi-mcps/book-of-ohdsi -- src/chunker.test.ts
npm run test --workspace @ohdsi-mcps/book-of-ohdsi -- -t "extractTitle"

# Regenerate the content bundle after moving the submodule pointer
git submodule update --remote packages/book-of-ohdsi/vendor/TheBookOfOhdsi
npm run generate-content --workspace @ohdsi-mcps/book-of-ohdsi
# (commit both the submodule pointer and the regenerated src/generated/content.ts)

# Local stdio MCP server for debugging / Claude Desktop
npm run dev --workspace @ohdsi-mcps/book-of-ohdsi

# Local HTTP gateway via wrangler
npm run dev --workspace @ohdsi-mcps/cf-worker      # http://127.0.0.1:8787/

# Deploy to Cloudflare (requires `wrangler login` first)
npm run deploy --workspace @ohdsi-mcps/cf-worker
```

## Adding a new MCP server

1. Scaffold `packages/<slug>/package.json` with `"name": "@ohdsi-mcps/<slug>"`, `"type": "module"`, and scripts matching `book-of-ohdsi`.
2. Export `create<Name>Server(): Promise<McpServer>` from `src/bundle.ts`, and re-export `McpServer` as a type so hosts do not need to depend on `@modelcontextprotocol/sdk` directly.
3. Expose `./bundle` in the package's `exports` map.
4. Append an entry to `MCP_REGISTRY` in `packages/cf-worker/src/index.ts` pointing at that factory. The route `/{slug}/mcp` is wired automatically.
5. Update the `## Available servers` table in the top-level `README.md` so end users can discover the new server and its current tool set.

MCP packages must remain Hono-agnostic; put Hono-specific wiring in `cf-worker` (or any other future transport host).

Whenever you add or remove a tool (or rename one) inside an existing MCP server, also update the matching row in the `## Available servers` table so the documented tool list stays in sync with the implementation.

## Dependency management

- **Dependencies MUST be added or updated through `npm i` (or `npm install <pkg>`)**. Editing `package.json` by hand and then running `npm install` is not allowed.
  - Rationale: lets npm resolve the actual latest version, keeps the lockfile in sync, and avoids round-trip mistakes.
  - Adding a runtime dep to `@ohdsi-mcps/book-of-ohdsi`: `npm i -w @ohdsi-mcps/book-of-ohdsi <pkg>`. Dev dep: add `-D`. Root-level shared tooling: `npm i -D <pkg>` from the repository root.
- Commit `package-lock.json` with every dependency change.

## Quality gate

Whenever you change code, **all three** of the following commands must pass before the work is reported as done. Reporting "complete" while any of them is red is not acceptable.

```sh
npm run knip    # dead-code / unused-export detection
npm run build   # tsc typecheck + dist emit
npm run test    # full vitest suite
```

If any command fails, fix the root cause and rerun until everything is green before calling the task done.

Once the quality gate is green, also run `npm run test:coverage` and report both a concise summary of the change and the resulting coverage metrics (overall percentage plus any notable per-file gaps). The coverage report accompanies every "done" announcement.

## Project conventions

- Node.js 24 LTS (see `.nvmrc`)
- npm workspaces for monorepo management
- TypeScript with `NodeNext` ESM, `strict`, `verbatimModuleSyntax`
- Upstream content (e.g. The Book of OHDSI) is vendored via git submodules so servers never hit the network at runtime
- This repository is distributed as English-speaking open source. **All source code, configuration, documentation, and commit messages must be written in English.** The `CLAUDE.md` files and any in-repo notes included.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
