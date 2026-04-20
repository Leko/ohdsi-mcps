import type { ChapterEntry, Manifest } from "./manifest.js";

const URI_SCHEME = "book-of-ohdsi";
export const TOC_URI = `${URI_SCHEME}://toc`;
export const CHAPTER_URI_PREFIX = `${URI_SCHEME}://chapter/`;
export const MIME_MARKDOWN = "text/markdown";
export const MIME_RMARKDOWN = "text/x-r-markdown";

export function chapterUri(slug: string): string {
  return `${CHAPTER_URI_PREFIX}${slug}`;
}

export function renderToc(manifest: Manifest): string {
  const { source, chapters } = manifest;
  const lines: string[] = [];
  lines.push("# The Book of OHDSI — Table of Contents");
  lines.push("");
  lines.push(
    `Snapshot of [${source.owner}/${source.repo}](https://github.com/${source.owner}/${source.repo}) at commit \`${source.commit}\` (vendored as a git submodule).`,
  );
  lines.push("");
  for (const chapter of chapters) {
    lines.push(`- \`${chapterUri(chapter.slug)}\` — ${chapter.title}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function findChapterBySlug(
  manifest: Manifest,
  slug: string,
): ChapterEntry | undefined {
  return manifest.chapters.find((chapter) => chapter.slug === slug);
}
