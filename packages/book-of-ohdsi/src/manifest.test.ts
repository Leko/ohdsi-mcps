import { describe, expect, it } from "vitest";
import {
  extractTitle,
  loadManifest,
  slugOf,
  stripYamlFrontmatter,
} from "./manifest.js";

describe("stripYamlFrontmatter", () => {
  it("removes the leading YAML block when present", () => {
    const input = `---\ntitle: "X"\nauthor: A\n---\n# Hello\n\nbody`;
    expect(stripYamlFrontmatter(input)).toBe("# Hello\n\nbody");
  });

  it("returns the text untouched when no frontmatter is present", () => {
    const input = "# Hello\n\nbody";
    expect(stripYamlFrontmatter(input)).toBe(input);
  });

  it("returns the text untouched when the block is not properly closed", () => {
    const input = "---\nstill frontmatter";
    expect(stripYamlFrontmatter(input)).toBe(input);
  });
});

describe("extractTitle", () => {
  it("returns the first H1 heading", () => {
    expect(extractTitle("# Chapter Title\n\nbody", "fallback")).toBe(
      "Chapter Title",
    );
  });

  it("strips bookdown attribute blocks like {#anchor} and {-}", () => {
    const rmd = "# The Common Data Model {#CommonDataModel}\n";
    expect(extractTitle(rmd, "fallback")).toBe("The Common Data Model");
  });

  it("skips (PART) markers and returns the next real heading", () => {
    const rmd = [
      "# (PART) Uniform Data Representation {-}",
      "",
      "# The Common Data Model {#cdm}",
      "",
      "body",
    ].join("\n");
    expect(extractTitle(rmd, "fallback")).toBe("The Common Data Model");
  });

  it("skips (APPENDIX) markers and returns the next real heading", () => {
    const rmd = ["# (APPENDIX) Appendix {-}", "", "# Glossary {#glossary}"].join(
      "\n",
    );
    expect(extractTitle(rmd, "fallback")).toBe("Glossary");
  });

  it("falls back to the part title when only a (PART) heading is present", () => {
    const rmd = "# (PART) Data Analytics {-}\n\nintroduction only";
    expect(extractTitle(rmd, "fallback")).toBe("Data Analytics");
  });

  it("strips the YAML frontmatter before scanning for headings", () => {
    const rmd = `---\ntitle: Y\n---\n# Real Title\n`;
    expect(extractTitle(rmd, "fallback")).toBe("Real Title");
  });

  it("returns the fallback when no H1 heading exists", () => {
    expect(extractTitle("## subheading only\n\ntext", "MySlug")).toBe("MySlug");
  });
});

describe("slugOf", () => {
  it("strips the .Rmd suffix case-insensitively", () => {
    expect(slugOf("CommonDataModel.Rmd")).toBe("CommonDataModel");
    expect(slugOf("index.RMD")).toBe("index");
  });

  it("leaves filenames without the .Rmd suffix untouched", () => {
    expect(slugOf("References")).toBe("References");
  });
});

describe("loadManifest (integration with the vendored submodule)", () => {
  it("produces the full chapter list with real titles", async () => {
    const manifest = await loadManifest();

    expect(manifest.source).toMatchObject({
      owner: "OHDSI",
      repo: "TheBookOfOhdsi",
    });
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$/);

    expect(manifest.chapters.length).toBeGreaterThan(20);
    expect(manifest.chapters[0]).toMatchObject({
      slug: "index",
      order: 0,
      title: "Preface",
    });

    const cdm = manifest.chapters.find((c) => c.slug === "CommonDataModel");
    expect(cdm?.title).toBe("The Common Data Model");
    expect(cdm?.filename).toBe("CommonDataModel.Rmd");

    const glossary = manifest.chapters.find((c) => c.slug === "Glossary");
    expect(glossary?.title).toBe("Glossary");
  });

  it("assigns sequential order starting from 0", async () => {
    const manifest = await loadManifest();
    manifest.chapters.forEach((chapter, index) => {
      expect(chapter.order).toBe(index);
    });
  });
});
