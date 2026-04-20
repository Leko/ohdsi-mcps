import { loadChapterBody, type Manifest } from "./manifest.js";
import { chapterUri, findChapterBySlug } from "./resources.js";
import { renderSearchHits, searchBook, type SearchIndex } from "./search.js";

export const SEARCH_LIMIT_DEFAULT = 5;
export const SEARCH_LIMIT_MAX = 50;

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

export function callReadChapter(
  manifest: Manifest,
  input: { slug: string },
): string {
  const chapter = findChapterBySlug(manifest, input.slug);
  if (!chapter) {
    throw new UnknownChapterError(
      input.slug,
      manifest.chapters.map((entry) => entry.slug),
    );
  }
  const body = loadChapterBody(chapter);
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

export function callSearchBook(
  index: SearchIndex,
  input: { query: string; limit?: number | undefined },
): string {
  const limit = input.limit ?? SEARCH_LIMIT_DEFAULT;
  const hits = searchBook(index, input.query, limit);
  return renderSearchHits(hits, input.query);
}
