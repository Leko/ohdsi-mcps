import { z } from "zod";
import { loadChapterBody, type Manifest } from "./manifest.js";
import { chapterUri, findChapterBySlug } from "./resources.js";
import {
  renderSearchHits,
  searchBook,
  type SearchIndex,
} from "./search.js";

export const LIST_CHAPTERS_TOOL_NAME = "list_chapters";
export const READ_CHAPTER_TOOL_NAME = "read_chapter";
export const SEARCH_BOOK_TOOL_NAME = "search_book";

const listChaptersInputSchema = z.object({}).strict();

export const listChaptersTool = {
  name: LIST_CHAPTERS_TOOL_NAME,
  description:
    "List every chapter of The Book of OHDSI, in reading order, with its slug, title, and MCP resource URI. Use this to discover what chapters exist before deciding which to read in detail.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
} as const;

export function parseListChaptersInput(input: unknown): void {
  listChaptersInputSchema.parse(input ?? {});
}

export function renderListChapters(manifest: Manifest): string {
  const { source, chapters } = manifest;
  const lines: string[] = [];
  lines.push(
    `Source: ${source.owner}/${source.repo} @ ${source.commit} (git submodule)`,
  );
  lines.push(`Chapters: ${chapters.length}`);
  lines.push("");
  lines.push("| # | slug | title | resource URI |");
  lines.push("| --- | --- | --- | --- |");
  for (const chapter of chapters) {
    lines.push(
      `| ${chapter.order + 1} | \`${chapter.slug}\` | ${chapter.title} | \`${chapterUri(chapter.slug)}\` |`,
    );
  }
  return lines.join("\n");
}

const readChapterInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .describe(
        "Chapter slug returned by list_chapters (e.g. \"CommonDataModel\", \"StandardizedVocabularies\").",
      ),
  })
  .strict();

export const readChapterTool = {
  name: READ_CHAPTER_TOOL_NAME,
  description:
    "Return the full R Markdown source of a single chapter of The Book of OHDSI. Call list_chapters first if you do not already know the slug.",
  inputSchema: {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description:
          "Chapter slug returned by list_chapters (e.g. \"CommonDataModel\").",
      },
    },
    required: ["slug"],
    additionalProperties: false,
  },
} as const;

type ReadChapterInput = z.infer<typeof readChapterInputSchema>;

export function parseReadChapterInput(input: unknown): ReadChapterInput {
  return readChapterInputSchema.parse(input ?? {});
}

export class UnknownChapterError extends Error {
  constructor(
    readonly slug: string,
    readonly availableSlugs: readonly string[],
  ) {
    super(
      `Unknown chapter slug "${slug}". Available slugs: ${availableSlugs.join(", ")}`,
    );
    this.name = "UnknownChapterError";
  }
}

export async function callReadChapter(
  manifest: Manifest,
  input: ReadChapterInput,
): Promise<string> {
  const chapter = findChapterBySlug(manifest, input.slug);
  if (!chapter) {
    throw new UnknownChapterError(
      input.slug,
      manifest.chapters.map((entry) => entry.slug),
    );
  }
  const body = await loadChapterBody(chapter);
  const header = [
    `# ${chapter.title}`,
    "",
    `- slug: \`${chapter.slug}\``,
    `- order: ${chapter.order + 1} / ${manifest.chapters.length}`,
    `- resource URI: \`${chapterUri(chapter.slug)}\``,
    `- source: ${manifest.source.owner}/${manifest.source.repo} @ ${manifest.source.commit}`,
    "",
    "---",
    "",
  ].join("\n");
  return header + body;
}

const SEARCH_LIMIT_DEFAULT = 5;
const SEARCH_LIMIT_MAX = 50;

const searchBookInputSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        "Free-text search query. Prefix and fuzzy matching are enabled so partial and slightly misspelled terms still match.",
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
  })
  .strict();

export const searchBookTool = {
  name: SEARCH_BOOK_TOOL_NAME,
  description:
    "Full-text search across every section of The Book of OHDSI, powered by MiniSearch. Each result is a single section (chapter heading or sub-heading) ranked by TF/IDF with prefix and fuzzy matching enabled. Use this whenever you need to locate which part of the book discusses an OHDSI topic before calling read_chapter for the full text.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Free-text search query. Prefix and fuzzy matching are applied automatically.",
      },
      limit: {
        type: "number",
        description: `Maximum number of matches to return (default ${SEARCH_LIMIT_DEFAULT}, max ${SEARCH_LIMIT_MAX}).`,
        minimum: 1,
        maximum: SEARCH_LIMIT_MAX,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
} as const;

type SearchBookInput = z.infer<typeof searchBookInputSchema>;

export function parseSearchBookInput(input: unknown): SearchBookInput {
  return searchBookInputSchema.parse(input ?? {});
}

export function callSearchBook(
  index: SearchIndex,
  input: SearchBookInput,
): string {
  const limit = input.limit ?? SEARCH_LIMIT_DEFAULT;
  const hits = searchBook(index, input.query, limit);
  return renderSearchHits(hits, input.query);
}
