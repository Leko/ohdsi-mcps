#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { loadChapterBody, loadManifest, type Manifest } from "./manifest.js";
import {
  CHAPTER_URI_PREFIX,
  MIME_MARKDOWN,
  MIME_RMARKDOWN,
  TOC_URI,
  chapterUri,
  findChapterBySlug,
  renderToc,
} from "./resources.js";
import { buildSearchIndex, type SearchIndex } from "./search.js";
import {
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  UnknownChapterError,
  callReadChapter,
  callSearchBook,
  renderListChapters,
} from "./tools.js";

export const RESOURCE_NOT_FOUND_CODE = -32002;
export const SERVER_NAME = "book-of-ohdsi";
export const SERVER_VERSION = "0.1.0";

const CHAPTER_URI_TEMPLATE = `${CHAPTER_URI_PREFIX}{slug}`;

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function createServer(
  manifest: Manifest,
  searchIndex: SearchIndex,
): McpServer {
  const mcp = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  mcp.registerResource(
    "toc",
    TOC_URI,
    {
      title: "The Book of OHDSI — Table of Contents",
      description:
        "Ordered list of every chapter in The Book of OHDSI with its MCP resource URI.",
      mimeType: MIME_MARKDOWN,
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MIME_MARKDOWN,
          text: renderToc(manifest),
        },
      ],
    }),
  );

  mcp.registerResource(
    "chapter",
    new ResourceTemplate(CHAPTER_URI_TEMPLATE, {
      list: () => ({
        resources: manifest.chapters.map((chapter) => ({
          uri: chapterUri(chapter.slug),
          name: chapter.slug,
          title: chapter.title,
          description: `The Book of OHDSI — ${chapter.title} (R Markdown source).`,
          mimeType: MIME_RMARKDOWN,
        })),
      }),
    }),
    {
      title: "The Book of OHDSI — Chapter",
      description:
        "A single chapter of The Book of OHDSI as R Markdown, identified by slug.",
      mimeType: MIME_RMARKDOWN,
    },
    (uri, { slug }) => {
      const slugValue = firstString(slug);
      const chapter = slugValue
        ? findChapterBySlug(manifest, slugValue)
        : undefined;
      if (!chapter) {
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
            text: loadChapterBody(chapter),
          },
        ],
      };
    },
  );

  mcp.registerTool(
    "list_chapters",
    {
      title: "List chapters",
      description:
        "List every chapter of The Book of OHDSI, in reading order, with its slug, title, and MCP resource URI. Use this to discover what chapters exist before deciding which to read in detail.",
      inputSchema: {},
    },
    () => ({
      content: [{ type: "text", text: renderListChapters(manifest) }],
    }),
  );

  mcp.registerTool(
    "read_chapter",
    {
      title: "Read a chapter",
      description:
        "Return the full R Markdown source of a single chapter of The Book of OHDSI. Call list_chapters first if you do not already know the slug.",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe(
            'Chapter slug returned by list_chapters (e.g. "CommonDataModel", "StandardizedVocabularies").',
          ),
      },
    },
    ({ slug }) => {
      try {
        const text = callReadChapter(manifest, { slug });
        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (error instanceof UnknownChapterError) {
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
    "search_book",
    {
      title: "Full-text search across the book",
      description:
        "Full-text search across every section of The Book of OHDSI, powered by MiniSearch. Each result is a single section (chapter heading or sub-heading) ranked by TF/IDF with prefix and fuzzy matching enabled. Use this whenever you need to locate which part of the book discusses an OHDSI topic before calling read_chapter for the full text.",
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
      },
    },
    ({ query, limit }) => ({
      content: [
        { type: "text", text: callSearchBook(searchIndex, { query, limit }) },
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
  const manifest = loadManifest();
  const searchIndex = await buildSearchIndex(manifest);
  const server = createServer(manifest, searchIndex);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (isMainModule()) {
  await main();
}
