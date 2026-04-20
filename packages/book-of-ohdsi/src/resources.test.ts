import { describe, expect, it } from "vitest";
import type { Manifest } from "./manifest.js";
import {
  CHAPTER_URI_PREFIX,
  MIME_MARKDOWN,
  MIME_RMARKDOWN,
  TOC_URI,
  chapterUri,
  findChapterBySlug,
  listResources,
  parseChapterUri,
  readResource,
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

describe("chapterUri / parseChapterUri", () => {
  it("round-trips a slug through chapterUri and parseChapterUri", () => {
    expect(chapterUri("CommonDataModel")).toBe(
      `${CHAPTER_URI_PREFIX}CommonDataModel`,
    );
    expect(parseChapterUri(chapterUri("CommonDataModel"))).toBe(
      "CommonDataModel",
    );
  });

  it("returns null when the URI does not belong to the chapter namespace", () => {
    expect(parseChapterUri(TOC_URI)).toBeNull();
    expect(parseChapterUri("http://example.com/foo")).toBeNull();
    expect(parseChapterUri("book-of-ohdsi://unknown")).toBeNull();
  });
});

describe("listResources", () => {
  it("puts the TOC entry first and lists every chapter after", () => {
    const resources = listResources(fakeManifest);
    expect(resources).toHaveLength(3);

    expect(resources[0]).toMatchObject({
      uri: TOC_URI,
      name: "toc",
      mimeType: MIME_MARKDOWN,
    });
    expect(resources[1]).toMatchObject({
      uri: `${CHAPTER_URI_PREFIX}index`,
      name: "index",
      title: "Preface",
      mimeType: MIME_RMARKDOWN,
    });
    expect(resources[2]?.title).toBe("The Common Data Model");
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

describe("readResource", () => {
  it("returns the rendered TOC when the URI is book-of-ohdsi://toc", async () => {
    const result = await readResource(fakeManifest, TOC_URI);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe(MIME_MARKDOWN);
    expect(result!.text).toContain(fakeManifest.source.commit);
  });

  it("returns null for an unknown URI scheme", async () => {
    expect(await readResource(fakeManifest, "unknown://foo")).toBeNull();
  });

  it("returns null for a chapter URI whose slug does not exist", async () => {
    const result = await readResource(
      fakeManifest,
      `${CHAPTER_URI_PREFIX}DoesNotExist`,
    );
    expect(result).toBeNull();
  });
});
