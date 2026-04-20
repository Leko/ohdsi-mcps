import { beforeAll, describe, expect, it } from "vitest";
import { loadManifest, type Manifest } from "./manifest.js";
import {
  buildSearchIndex,
  renderSearchHits,
  searchBook,
  type SearchIndex,
} from "./search.js";

describe("buildSearchIndex / searchBook (integration with the vendored submodule)", () => {
  let manifest: Manifest;
  let index: SearchIndex;

  beforeAll(async () => {
    manifest = await loadManifest();
    index = await buildSearchIndex(manifest);
  });

  it("returns hits ranked by relevance when querying a known OHDSI concept", () => {
    const hits = searchBook(index, "common data model", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.category === "CommonDataModel")).toBe(true);
    const firstTitle = hits[0]!.title;
    expect(firstTitle.toLowerCase()).toContain("data");
  });

  it("produces snippets that include the queried term when present in text", () => {
    const hits = searchBook(index, "vocabulary", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.some((h) => h.snippet.toLowerCase().includes("vocabular")),
    ).toBe(true);
  });

  it("returns an empty list for whitespace-only queries", () => {
    expect(searchBook(index, "   ", 5)).toEqual([]);
  });

  it("respects the limit argument", () => {
    const hits = searchBook(index, "data", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("stamps every chunk with an id prefixed by its chapter slug", () => {
    const hits = searchBook(index, "OHDSI", 10);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.id.startsWith(`${hit.category}-`)).toBe(true);
    }
  });
});

describe("renderSearchHits", () => {
  it("formats hits as numbered markdown with titles, categories, and snippets", () => {
    const hits = [
      {
        id: "Foo-bar",
        title: "Bar | Foo",
        category: "Foo",
        score: 3.1415,
        snippet: "matching text here",
      },
    ];
    const rendered = renderSearchHits(hits, "bar");
    expect(rendered).toContain("1 result for \"bar\":");
    expect(rendered).toContain("**Bar | Foo**");
    expect(rendered).toContain("`Foo-bar`");
    expect(rendered).toContain("3.14");
    expect(rendered).toContain("matching text here");
  });

  it("uses 'No results' when the hit list is empty", () => {
    expect(renderSearchHits([], "nothing")).toBe('No results for "nothing".');
  });
});
