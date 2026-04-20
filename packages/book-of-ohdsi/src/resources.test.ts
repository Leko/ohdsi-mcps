import { describe, expect, it } from "vitest";
import type { Manifest } from "./manifest.js";
import {
  CHAPTER_URI_PREFIX,
  chapterUri,
  findChapterBySlug,
  renderToc,
} from "./resources.js";

const fakeManifest: Manifest = {
  source: {
    owner: "OHDSI",
    repo: "TheBookOfOhdsi",
    commit: "abcdef0123456789abcdef0123456789abcdef01",
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

describe("chapterUri", () => {
  it("builds a canonical URI from a chapter slug", () => {
    expect(chapterUri("CommonDataModel")).toBe(
      `${CHAPTER_URI_PREFIX}CommonDataModel`,
    );
  });
});

describe("renderToc", () => {
  it("includes the commit SHA and every chapter URI", () => {
    const toc = renderToc(fakeManifest);
    expect(toc).toContain(fakeManifest.source.commit);
    expect(toc).toContain(`${CHAPTER_URI_PREFIX}index`);
    expect(toc).toContain(`${CHAPTER_URI_PREFIX}CommonDataModel`);
    expect(toc).toContain("Preface");
    expect(toc).toContain("The Common Data Model");
  });
});

describe("findChapterBySlug", () => {
  it("returns the chapter when the slug exists", () => {
    const chapter = findChapterBySlug(fakeManifest, "CommonDataModel");
    expect(chapter?.filename).toBe("CommonDataModel.Rmd");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findChapterBySlug(fakeManifest, "Nope")).toBeUndefined();
  });
});
