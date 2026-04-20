import { describe, expect, it } from "vitest";
import { chunkChapter, type SearchChunk } from "./chunker.js";
import type { ChapterEntry } from "./manifest.js";

const fakeChapter: ChapterEntry = {
  slug: "CommonDataModel",
  filename: "CommonDataModel.Rmd",
  title: "The Common Data Model",
  order: 4,
};

function titles(chunks: SearchChunk[]): string[] {
  return chunks.map((c) => c.title);
}

function ids(chunks: SearchChunk[]): string[] {
  return chunks.map((c) => c.id);
}

describe("chunkChapter", () => {
  it("emits one chunk per heading and stamps the category to the chapter slug", () => {
    const rmd = [
      "# The Common Data Model {#cdm}",
      "",
      "Introductory paragraph.",
      "",
      "## Design Principles {#cdm-design}",
      "",
      "Design body paragraph.",
      "",
      "## Data Domains",
      "",
      "Domains body paragraph.",
      "",
    ].join("\n");

    const chunks = chunkChapter(fakeChapter, rmd);

    expect(ids(chunks)).toEqual([
      "CommonDataModel-cdm",
      "CommonDataModel-cdm-design",
      "CommonDataModel-data-domains",
    ]);
    expect(titles(chunks)).toEqual([
      "The Common Data Model | The Common Data Model",
      "Design Principles | The Common Data Model",
      "Data Domains | The Common Data Model",
    ]);
    expect(chunks.every((c) => c.category === "CommonDataModel")).toBe(true);
    expect(chunks[0]!.text).toBe("Introductory paragraph.");
    expect(chunks[1]!.text).toBe("Design body paragraph.");
  });

  it("prefers the {#explicit-id} over a slugified heading when both are derivable", () => {
    const rmd = "# The Common Data Model {#CommonDataModel}\n\nbody";
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(chunks[0]!.id).toBe("CommonDataModel-CommonDataModel");
  });

  it("skips bookdown (PART) markers when they have no body", () => {
    const rmd = [
      "# (PART) Uniform Data Representation {-}",
      "",
      "# The Common Data Model {#cdm}",
      "",
      "body",
    ].join("\n");
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(chunks.map((c) => c.title)).toEqual([
      "The Common Data Model | The Common Data Model",
    ]);
  });

  it("strips YAML frontmatter before parsing", () => {
    const rmd = [
      "---",
      "title: Whatever",
      "---",
      "",
      "# Only Heading",
      "",
      "text",
    ].join("\n");
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.title).toBe("Only Heading | The Common Data Model");
    expect(chunks[0]!.text).toBe("text");
  });

  it("treats repeated slugified headings as unique via numeric suffixes", () => {
    const rmd = [
      "# Overview",
      "",
      "intro 1",
      "",
      "# Overview",
      "",
      "intro 2",
    ].join("\n");
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(ids(chunks)).toEqual([
      "CommonDataModel-overview",
      "CommonDataModel-overview-2",
    ]);
  });

  it("ignores content before the very first heading", () => {
    const rmd = [
      "orphan preamble that has no heading",
      "",
      "# First",
      "",
      "body",
    ].join("\n");
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe("body");
  });

  it("captures paragraphs, code blocks, and list items in plain text", () => {
    const rmd = [
      "# Section",
      "",
      "paragraph one",
      "",
      "```{r}",
      "data.frame(x = 1)",
      "```",
      "",
      "- list item A",
      "- list item B",
    ].join("\n");
    const chunks = chunkChapter(fakeChapter, rmd);
    expect(chunks).toHaveLength(1);
    const text = chunks[0]!.text;
    expect(text).toContain("paragraph one");
    expect(text).toContain("data.frame(x = 1)");
    expect(text).toContain("list item A");
    expect(text).toContain("list item B");
  });
});
