#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  DEFAULT_VERSION,
  SUPPORTED_VERSIONS,
  findDocumentBySlug,
  listDocuments,
  loadDocumentBody,
} from "./manifest.js";
import {
  DOCUMENT_URI_PREFIX,
  MIME_MARKDOWN,
  MIME_RMARKDOWN,
  TOC_URI,
  documentUri,
  renderToc,
} from "./resources.js";
import { buildSearchIndex, type SearchIndex } from "./search.js";
import {
  SEARCH_KINDS,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  UnknownDocumentError,
  UnknownTableError,
  UnknownVersionError,
  callListFields,
  callListTables,
  callReadDocument,
  callSearch,
  renderListDocuments,
} from "./tools.js";

export const RESOURCE_NOT_FOUND_CODE = -32002;
export const SERVER_NAME = "omop-cdm";
export const SERVER_VERSION = "0.1.0";

const DOCUMENT_URI_TEMPLATE = `${DOCUMENT_URI_PREFIX}{slug}`;

const versionSchema = z
  .enum(SUPPORTED_VERSIONS)
  .optional()
  .describe(
    `OMOP CDM version. Defaults to "${DEFAULT_VERSION}" (latest) when omitted. Supported: ${SUPPORTED_VERSIONS.join(", ")}.`,
  );

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function createServer(searchIndex: SearchIndex): McpServer {
  const mcp = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  mcp.registerResource(
    "documents",
    TOC_URI,
    {
      title: "OMOP CDM — R Markdown documents index",
      description:
        "Ordered list of every OMOP CDM R Markdown document with its MCP resource URI.",
      mimeType: MIME_MARKDOWN,
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MIME_MARKDOWN,
          text: renderToc(),
        },
      ],
    }),
  );

  mcp.registerResource(
    "document",
    new ResourceTemplate(DOCUMENT_URI_TEMPLATE, {
      list: () => ({
        resources: listDocuments().map((doc) => ({
          uri: documentUri(doc.slug),
          name: doc.slug,
          title: doc.title,
          description: `OMOP CDM R Markdown document — ${doc.title} (${doc.filename}).`,
          mimeType: MIME_RMARKDOWN,
        })),
      }),
    }),
    {
      title: "OMOP CDM — R Markdown document",
      description:
        "A single OMOP CDM R Markdown document, identified by slug.",
      mimeType: MIME_RMARKDOWN,
    },
    (uri, { slug }) => {
      const slugValue = firstString(slug);
      const doc = slugValue ? findDocumentBySlug(slugValue) : undefined;
      if (!doc) {
        throw new McpError(
          RESOURCE_NOT_FOUND_CODE,
          `Resource not found: ${uri.href}`,
          { uri: uri.href },
        );
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MIME_RMARKDOWN,
            text: loadDocumentBody(doc),
          },
        ],
      };
    },
  );

  mcp.registerTool(
    "omop-cdm_table_list",
    {
      title: "List OMOP CDM tables",
      description:
        `List every table defined by a given OMOP Common Data Model version, sourced from the OHDSI/CommonDataModel CSV specs (versions ${SUPPORTED_VERSIONS.join(", ")}). Returns a markdown table of table name, schema, required flag, and a short description. Call omop-cdm_field_list next to inspect the columns of a specific table. Version defaults to "${DEFAULT_VERSION}" (latest) when omitted.`,
      inputSchema: {
        version: versionSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ version }) => {
      try {
        const text = callListTables({ version });
        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (error instanceof UnknownVersionError) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
        throw error;
      }
    },
  );

  mcp.registerTool(
    "omop-cdm_field_list",
    {
      title: "List OMOP CDM fields for a table",
      description:
        `List every field (column) of a single OMOP Common Data Model table for a given version, sourced from the OHDSI/CommonDataModel CSV specs. Returns a markdown table of field name, datatype, required flag, primary-key flag, and foreign-key target. Call omop-cdm_table_list first to discover table names. Version defaults to "${DEFAULT_VERSION}" (latest) when omitted.`,
      inputSchema: {
        table: z
          .string()
          .min(1)
          .describe(
            'OMOP CDM table name returned by omop-cdm_table_list (e.g. "person", "visit_occurrence"). Matched case-insensitively.',
          ),
        version: versionSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ table, version }) => {
      try {
        const text = callListFields({ table, version });
        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (
          error instanceof UnknownVersionError ||
          error instanceof UnknownTableError
        ) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
        throw error;
      }
    },
  );

  mcp.registerTool(
    "omop-cdm_document_list",
    {
      title: "List OMOP CDM R Markdown documents",
      description:
        "List every R Markdown document published alongside the OHDSI/CommonDataModel repository (CDM change logs, conventions, FAQ, etc.) in `rmd/`. Returns a markdown table of slug, title, and MCP resource URI. Call omop-cdm_document_read to fetch the full body.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => ({
      content: [{ type: "text", text: renderListDocuments() }],
    }),
  );

  mcp.registerTool(
    "omop-cdm_document_read",
    {
      title: "Read a single OMOP CDM R Markdown document",
      description:
        "Return the full R Markdown source of a single OMOP CDM document by slug. Call omop-cdm_document_list first if you do not already know the slug.",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe(
            'Document slug returned by omop-cdm_document_list (e.g. "cdm54Changes", "dataModelConventions"). Matched case-insensitively.',
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ slug }) => {
      try {
        const text = callReadDocument({ slug });
        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (error instanceof UnknownDocumentError) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
        throw error;
      }
    },
  );

  mcp.registerTool(
    "omop-cdm_search",
    {
      title: "Full-text search across OMOP CDM content",
      description:
        `Full-text search across every OMOP CDM R Markdown section (chunked by heading) and every CSV row (one chunk per table row and per field row, for all supported versions ${SUPPORTED_VERSIONS.join(", ")}), powered by MiniSearch with prefix and fuzzy matching. Each hit is returned with a title, category, score, and a short snippet. Use the optional \`kinds\` filter to scope to documents ("rmd"), table rows ("csv-table"), or field rows ("csv-field"). Call omop-cdm_document_read or omop-cdm_field_list afterwards for the full context of a promising hit.`,
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Free-text search query. Prefix and fuzzy matching are applied automatically.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(SEARCH_LIMIT_MAX)
          .optional()
          .describe(
            `Maximum number of matches to return (default ${SEARCH_LIMIT_DEFAULT}, max ${SEARCH_LIMIT_MAX}).`,
          ),
        kinds: z
          .array(z.enum(SEARCH_KINDS))
          .min(1)
          .optional()
          .describe(
            `Optional filter limiting results to specific chunk kinds. Allowed values: ${SEARCH_KINDS.join(", ")}. When omitted, results include every kind.`,
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, limit, kinds }) => ({
      content: [
        {
          type: "text",
          text: callSearch(searchIndex, { query, limit, kinds }),
        },
      ],
    }),
  );

  return mcp;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

async function main(): Promise<void> {
  const index = buildSearchIndex();
  const server = createServer(index);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (isMainModule()) {
  await main();
}
