# ohdsi-mcps

Monorepo of Model Context Protocol (MCP) servers for the OHDSI ecosystem. Each individual MCP server lives under `packages/*`.

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

## Project conventions

- Node.js 24 LTS (see `.nvmrc`)
- npm workspaces for monorepo management
- TypeScript with `NodeNext` ESM, `strict`, `verbatimModuleSyntax`
- Upstream content (e.g. The Book of OHDSI) is vendored via git submodules so servers never hit the network at runtime
- This repository is distributed as English-speaking open source. **All source code, configuration, documentation, and commit messages must be written in English.** The `CLAUDE.md` files and any in-repo notes included.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
