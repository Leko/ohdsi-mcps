import MiniSearch from "minisearch";
import { chunkChapter, type SearchChunk } from "./chunker.js";
import { loadChapterBody, type Manifest } from "./manifest.js";

const INDEX_FIELDS = ["title", "text"] as const;
const STORE_FIELDS = ["id", "title", "text", "category"] as const;

export type SearchIndex = MiniSearch<SearchChunk>;

type SearchHit = {
  id: string;
  title: string;
  category: string;
  score: number;
  snippet: string;
};

function createIndex(): SearchIndex {
  return new MiniSearch<SearchChunk>({
    fields: [...INDEX_FIELDS],
    storeFields: [...STORE_FIELDS],
    idField: "id",
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 2 },
    },
  });
}

export async function buildSearchIndex(
  manifest: Manifest,
): Promise<SearchIndex> {
  const index = createIndex();
  const perChapterChunks = await Promise.all(
    manifest.chapters.map(async (chapter) => {
      const body = await loadChapterBody(chapter);
      return chunkChapter(chapter, body);
    }),
  );
  for (const chunks of perChapterChunks) {
    index.addAll(chunks);
  }
  return index;
}

const SNIPPET_RADIUS = 80;
const SNIPPET_MAX_LEN = 240;

function buildSnippet(text: string, query: string): string {
  const normalizedQuery = query.trim().toLowerCase();
  const firstTerm = normalizedQuery.split(/\s+/)[0] ?? "";
  const lowerText = text.toLowerCase();
  const hit = firstTerm ? lowerText.indexOf(firstTerm) : -1;
  if (hit === -1) {
    return text.slice(0, SNIPPET_MAX_LEN).replace(/\s+/g, " ").trim();
  }
  const start = Math.max(0, hit - SNIPPET_RADIUS);
  const end = Math.min(text.length, hit + firstTerm.length + SNIPPET_RADIUS);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

export function searchBook(
  index: SearchIndex,
  query: string,
  limit: number,
): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const results = index.search(trimmed).slice(0, limit);
  return results.map((result) => {
    const stored = index.getStoredFields(String(result.id)) as
      | SearchChunk
      | undefined;
    return {
      id: String(result.id),
      title: stored?.title ?? "",
      category: stored?.category ?? "",
      score: result.score,
      snippet: buildSnippet(stored?.text ?? "", trimmed),
    };
  });
}

export function renderSearchHits(hits: SearchHit[], query: string): string {
  if (hits.length === 0) {
    return `No results for "${query}".`;
  }
  const lines: string[] = [];
  lines.push(`${hits.length} result${hits.length === 1 ? "" : "s"} for "${query}":`);
  lines.push("");
  for (const [index, hit] of hits.entries()) {
    const chapter = hit.category;
    lines.push(
      `${index + 1}. **${hit.title}** (chapter \`${chapter}\`, score ${hit.score.toFixed(2)})`,
    );
    lines.push(`   id: \`${hit.id}\``);
    if (hit.snippet) {
      lines.push(`   > ${hit.snippet}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
