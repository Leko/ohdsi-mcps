import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import type { Manifest } from "./manifest.js";
import {
  LIST_CHAPTERS_TOOL_NAME,
  READ_CHAPTER_TOOL_NAME,
  UnknownChapterError,
  callReadChapter,
  listChaptersTool,
  parseListChaptersInput,
  parseReadChapterInput,
  readChapterTool,
  renderListChapters,
} from "./tools.js";

const fakeManifest: Manifest = {
  source: {
    owner: "OHDSI",
    repo: "TheBookOfOhdsi",
    commit: "deadbeef".repeat(5),
  },
  chapters: [
    {
      slug: "index",
      filename: "index.Rmd",
      title: "Preface",
      order: 0,
    },
    {
      slug: "CommonDataModel",
      filename: "CommonDataModel.Rmd",
      title: "The Common Data Model",
      order: 1,
    },
  ],
};

describe("tool definitions", () => {
  it("exposes list_chapters and read_chapter with JSON Schema inputSchema", () => {
    expect(listChaptersTool.name).toBe(LIST_CHAPTERS_TOOL_NAME);
    expect(listChaptersTool.inputSchema.type).toBe("object");
    expect(listChaptersTool.inputSchema.additionalProperties).toBe(false);

    expect(readChapterTool.name).toBe(READ_CHAPTER_TOOL_NAME);
    expect(readChapterTool.inputSchema.required).toEqual(["slug"]);
  });
});

describe("parseListChaptersInput", () => {
  it("accepts empty objects and missing input", () => {
    expect(() => parseListChaptersInput({})).not.toThrow();
    expect(() => parseListChaptersInput(undefined)).not.toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => parseListChaptersInput({ foo: "bar" })).toThrow(ZodError);
  });
});

describe("parseReadChapterInput", () => {
  it("accepts a valid slug", () => {
    expect(parseReadChapterInput({ slug: "index" })).toEqual({ slug: "index" });
  });

  it("rejects missing slug", () => {
    expect(() => parseReadChapterInput({})).toThrow(ZodError);
    expect(() => parseReadChapterInput(undefined)).toThrow(ZodError);
  });

  it("rejects empty-string slug", () => {
    expect(() => parseReadChapterInput({ slug: "" })).toThrow(ZodError);
  });

  it("rejects unknown keys", () => {
    expect(() => parseReadChapterInput({ slug: "ok", extra: 1 })).toThrow(
      ZodError,
    );
  });
});

describe("renderListChapters", () => {
  it("emits a markdown table with every chapter and metadata header", () => {
    const out = renderListChapters(fakeManifest);
    expect(out).toContain(`Chapters: ${fakeManifest.chapters.length}`);
    expect(out).toContain(fakeManifest.source.commit);
    expect(out).toContain("`index`");
    expect(out).toContain("`CommonDataModel`");
    expect(out).toContain("book-of-ohdsi://chapter/CommonDataModel");
  });

  it("numbers chapters starting at 1 based on order", () => {
    const out = renderListChapters(fakeManifest);
    expect(out).toContain("| 1 | `index`");
    expect(out).toContain("| 2 | `CommonDataModel`");
  });
});

describe("callReadChapter", () => {
  it("throws UnknownChapterError with the list of available slugs", async () => {
    await expect(
      callReadChapter(fakeManifest, { slug: "Bogus" }),
    ).rejects.toBeInstanceOf(UnknownChapterError);

    try {
      await callReadChapter(fakeManifest, { slug: "Bogus" });
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownChapterError);
      const e = error as UnknownChapterError;
      expect(e.availableSlugs).toContain("index");
      expect(e.availableSlugs).toContain("CommonDataModel");
    }
  });

  it("returns the chapter body prefixed with a metadata header (integration with the vendored submodule)", async () => {
    const { loadManifest } = await import("./manifest.js");
    const realManifest = await loadManifest();

    const output = await callReadChapter(realManifest, {
      slug: "CommonDataModel",
    });

    expect(output).toContain("# The Common Data Model");
    expect(output).toContain("slug: `CommonDataModel`");
    expect(output).toContain("resource URI: `book-of-ohdsi://chapter/CommonDataModel`");
    expect(output).toContain(realManifest.source.commit);
    expect(output).toContain("---");
  });
});
