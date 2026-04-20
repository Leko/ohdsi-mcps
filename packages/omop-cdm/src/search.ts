import MiniSearch from "minisearch";

import { buildAllChunks, type SearchChunk, type SearchChunkKind } from "./chunker.js";

const INDEX_FIELDS = ["title", "text", "tableName", "fieldName"] as const;
const STORE_FIELDS = [
  "id",
  "title",
  "text",
  "kind",
  "category",
  "documentSlug",
  "version",
  "tableName",
  "fieldName",
] as const;

export type SearchIndex = MiniSearch<SearchChunk>;

interface SearchHit {
  id: string;
  title: string;
  category: string;
  kind: SearchChunkKind;
  score: number;
  snippet: string;
}

function createIndex(): SearchIndex {
  return new MiniSearch<SearchChunk>({
    fields: [...INDEX_FIELDS],
    storeFields: [...STORE_FIELDS],
    idField: "id",
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 2, tableName: 1.5, fieldName: 1.5 },
    },
  });
}

export function buildSearchIndex(): SearchIndex {
  const index = createIndex();
  index.addAll(buildAllChunks());
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

interface SearchParams {
  query: string;
  limit: number;
  kinds?: readonly SearchChunkKind[];
}

export function search(index: SearchIndex, params: SearchParams): SearchHit[] {
  const trimmed = params.query.trim();
  if (!trimmed) return [];
  const kindFilter = params.kinds && params.kinds.length > 0 ? new Set(params.kinds) : null;
  const results = index.search(trimmed, {
    filter: kindFilter
      ? (result) => kindFilter.has((result as unknown as { kind: SearchChunkKind }).kind)
      : undefined,
  });
  const hits: SearchHit[] = [];
  for (const result of results) {
    const stored = index.getStoredFields(String(result.id)) as
      | SearchChunk
      | undefined;
    hits.push({
      id: String(result.id),
      title: stored?.title ?? "",
      category: stored?.category ?? "",
      kind: (stored?.kind ?? "rmd") as SearchChunkKind,
      score: result.score,
      snippet: buildSnippet(stored?.text ?? "", trimmed),
    });
    if (hits.length >= params.limit) break;
  }
  return hits;
}

export function renderSearchHits(hits: SearchHit[], query: string): string {
  if (hits.length === 0) {
    return `No results for "${query}".`;
  }
  const lines: string[] = [];
  lines.push(
    `${hits.length} result${hits.length === 1 ? "" : "s"} for "${query}":`,
  );
  lines.push("");
  for (const [i, hit] of hits.entries()) {
    lines.push(
      `${i + 1}. **${hit.title}** (${hit.category}, score ${hit.score.toFixed(2)})`,
    );
    lines.push(`   id: \`${hit.id}\``);
    if (hit.snippet) {
      lines.push(`   > ${hit.snippet}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
