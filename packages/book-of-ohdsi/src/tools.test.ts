import { describe, expect, it } from "vitest";
import type { Manifest } from "./manifest.js";
import {
  UnknownChapterError,
  callReadChapter,
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
  it("throws UnknownChapterError with the list of available slugs", () => {
    expect(() =>
      callReadChapter(fakeManifest, { slug: "Bogus" }),
    ).toThrowError(UnknownChapterError);

    try {
      callReadChapter(fakeManifest, { slug: "Bogus" });
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownChapterError);
      const e = error as UnknownChapterError;
      expect(e.availableSlugs).toContain("index");
      expect(e.availableSlugs).toContain("CommonDataModel");
    }
  });

  it("returns the chapter body prefixed with a metadata header (integration with the vendored submodule)", async () => {
    const { loadManifest } = await import("./manifest.js");
    const realManifest = loadManifest();

    const output = callReadChapter(realManifest, {
      slug: "CommonDataModel",
    });

    expect(output).toContain("# The Common Data Model");
    expect(output).toContain("slug: `CommonDataModel`");
    expect(output).toContain(
      "resource URI: `book-of-ohdsi://chapter/CommonDataModel`",
    );
    expect(output).toContain(realManifest.source.commit);
    expect(output).toContain("---");
  });
});
