import type { ChapterEntry, Manifest } from "./manifest.js";
import { loadChapterBody } from "./manifest.js";

const URI_SCHEME = "book-of-ohdsi";
export const TOC_URI = `${URI_SCHEME}://toc`;
export const CHAPTER_URI_PREFIX = `${URI_SCHEME}://chapter/`;
export const MIME_MARKDOWN = "text/markdown";
export const MIME_RMARKDOWN = "text/x-r-markdown";

export function chapterUri(slug: string): string {
  return `${CHAPTER_URI_PREFIX}${slug}`;
}

export function parseChapterUri(uri: string): string | null {
  if (!uri.startsWith(CHAPTER_URI_PREFIX)) return null;
  return uri.slice(CHAPTER_URI_PREFIX.length);
}

export function listResources(manifest: Manifest) {
  const chapters = manifest.chapters.map((chapter) => ({
    uri: chapterUri(chapter.slug),
    name: chapter.slug,
    title: chapter.title,
    description: `The Book of OHDSI — ${chapter.title} (R Markdown source).`,
    mimeType: MIME_RMARKDOWN,
  }));
  return [
    {
      uri: TOC_URI,
      name: "toc",
      title: "The Book of OHDSI — Table of Contents",
      description:
        "Ordered list of every chapter in The Book of OHDSI with its MCP resource URI.",
      mimeType: MIME_MARKDOWN,
    },
    ...chapters,
  ];
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

type ReadResult = {
  uri: string;
  mimeType: string;
  text: string;
};

export async function readResource(
  manifest: Manifest,
  uri: string,
): Promise<ReadResult | null> {
  if (uri === TOC_URI) {
    return { uri, mimeType: MIME_MARKDOWN, text: renderToc(manifest) };
  }
  const slug = parseChapterUri(uri);
  if (slug === null) return null;
  const chapter = findChapterBySlug(manifest, slug);
  if (!chapter) return null;
  const text = await loadChapterBody(chapter);
  return { uri, mimeType: MIME_RMARKDOWN, text };
}
