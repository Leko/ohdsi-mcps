# @ohdsi-mcps/omop-cdm

Model Context Protocol (MCP) server exposing the OMOP Common Data Model
specification — table definitions, field definitions, and companion R
Markdown documents — for CDM versions 5.3, 5.4, and 6.0. All content is
sourced from the upstream [OHDSI/CommonDataModel](https://github.com/OHDSI/CommonDataModel)
repository, which is vendored via a git submodule at
`vendor/CommonDataModel` and snapshotted into
`src/generated/content.ts` at build time by
`scripts/generate-content.ts`. The server therefore does no network or
filesystem I/O at runtime and can be hosted on Cloudflare Workers,
Vercel Functions, Deno, Bun, or Node stdio without any platform-specific
shim.

## Tools

| Name | Description |
| --- | --- |
| `omop-cdm_table_list` | List every OMOP CDM table for a given `version` (one of `5.3`, `5.4`, `6.0`; defaults to `5.4`, the latest). Returns a markdown table of table name, schema, required flag, and a short description. |
| `omop-cdm_field_list` | List every field (column) of a single OMOP CDM table for a given `version` (defaults to `5.4`). Returns a markdown table of field name, datatype, required flag, primary-key flag, and foreign-key target. |
| `omop-cdm_document_list` | List every R Markdown document shipped alongside the CommonDataModel repository (change logs, conventions, FAQ, …) with its slug and MCP resource URI. |
| `omop-cdm_document_read` | Return the full R Markdown source of a single OMOP CDM document by slug. |

All tools are read-only (`readOnlyHint: true`) and operate on a closed,
bundled corpus (`openWorldHint: false`).

## Resources

- `omop-cdm://documents` — markdown index of every R Markdown document.
- `omop-cdm://document/{slug}` — raw R Markdown source of the document
  with the given slug.

## Versioning

The default version is `5.4` (latest). Users can pass `version: "5.3"` or
`version: "6.0"` to target other supported CDM versions. Any other value
is rejected by the zod `enum` schema on the tool input.

## Regenerating the bundled content

```sh
git submodule update --remote packages/omop-cdm/vendor/CommonDataModel
npm run generate-content --workspace @ohdsi-mcps/omop-cdm
# Commit both the submodule pointer and the regenerated src/generated/content.ts
```

The codegen script applies deterministic string patches to a small
number of upstream CSV rows that contain unescaped commas (see
`CSV_PATCHES` in `scripts/generate-content.ts`). Each patch asserts the
target substring still exists so the workaround cannot silently rot once
upstream fixes the row.
