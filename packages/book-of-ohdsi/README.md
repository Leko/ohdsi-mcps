# @ohdsi-mcps/book-of-ohdsi

Model Context Protocol (MCP) resource server that exposes [The Book of OHDSI](https://github.com/OHDSI/TheBookOfOhdsi) as MCP resources so that AI assistants can cite the canonical OHDSI reference material.

## Content provenance

The book content is vendored as a git submodule at `vendor/TheBookOfOhdsi`, pinned to a specific upstream commit of [OHDSI/TheBookOfOhdsi](https://github.com/OHDSI/TheBookOfOhdsi) (CC0-1.0). Update by running `git submodule update --remote packages/book-of-ohdsi/vendor/TheBookOfOhdsi` and committing the new pointer.

## Resources exposed

| URI | Description |
| --- | --- |
| `book-of-ohdsi://toc` | Table of contents with every chapter and its slug. |
| `book-of-ohdsi://chapter/{slug}` | R Markdown body of a single chapter. |

## Run

```sh
git submodule update --init packages/book-of-ohdsi/vendor/TheBookOfOhdsi
npm install
npm run build --workspace @ohdsi-mcps/book-of-ohdsi
./packages/book-of-ohdsi/dist/server.js   # stdio MCP server
```

## License

Apache-2.0. See `NOTICE` for third-party attribution.
