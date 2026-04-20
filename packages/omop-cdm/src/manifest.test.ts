import { describe, expect, it } from "vitest";

import {
  DEFAULT_VERSION,
  MANIFEST,
  RMD_DOCUMENT_BLACKLIST,
  SUPPORTED_VERSIONS,
  extractDocumentTitle,
  findDocumentBySlug,
  hasTable,
  isBlacklistedDocument,
  isSupportedVersion,
  listDocuments,
  listFields,
  listFieldsForTable,
  listTables,
  loadDocumentBody,
  slugOfRmd,
} from "./manifest.js";

describe("manifest", () => {
  it("advertises the expected supported versions with 5.4 as default", () => {
    expect(SUPPORTED_VERSIONS).toEqual(["5.3", "5.4", "6.0"]);
    expect(DEFAULT_VERSION).toBe("5.4");
    expect(MANIFEST.source.owner).toBe("OHDSI");
    expect(MANIFEST.source.repo).toBe("CommonDataModel");
    expect(MANIFEST.source.commit).toMatch(/^[0-9a-f]{7,}$/);
  });

  it("lists tables for each supported version", () => {
    for (const version of SUPPORTED_VERSIONS) {
      const tables = listTables(version);
      expect(tables.length).toBeGreaterThan(0);
      expect(tables[0]!.cdmTableName).toBe("person");
      expect(tables.some((t) => t.cdmTableName === "concept")).toBe(true);
    }
  });

  it("lists fields for each supported version and filters by table case-insensitively", () => {
    for (const version of SUPPORTED_VERSIONS) {
      const all = listFields(version);
      expect(all.length).toBeGreaterThan(listTables(version).length);
      const personFields = listFieldsForTable(version, "PERSON");
      expect(personFields.length).toBeGreaterThan(0);
      expect(
        personFields.every(
          (f) => f.cdmTableName.toLowerCase() === "person",
        ),
      ).toBe(true);
      expect(personFields.some((f) => f.cdmFieldName === "person_id")).toBe(
        true,
      );
    }
  });

  it("returns an empty field list for an unknown table rather than throwing", () => {
    expect(listFieldsForTable("5.4", "definitely_not_a_table")).toEqual([]);
    expect(hasTable("5.4", "definitely_not_a_table")).toBe(false);
    expect(hasTable("5.4", "Person")).toBe(true);
  });

  it("version guard accepts only supported versions", () => {
    expect(isSupportedVersion("5.4")).toBe(true);
    expect(isSupportedVersion("5.3")).toBe(true);
    expect(isSupportedVersion("6.0")).toBe(true);
    expect(isSupportedVersion("5.5")).toBe(false);
    expect(isSupportedVersion("")).toBe(false);
  });
});

describe("rmd documents", () => {
  it("exposes Rmd files as documents with slugs and titles, minus the CSV mirrors", () => {
    const docs = listDocuments();
    expect(docs.length).toBeGreaterThan(10);
    for (const doc of docs) {
      expect(doc.slug).not.toContain(".");
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.filename).toMatch(/\.rmd$/i);
      expect(isBlacklistedDocument(doc.filename)).toBe(false);
    }
    // cdm54Changes (narrative) is kept but cdm54 (CSV mirror) is excluded
    expect(docs.find((d) => d.slug === "cdm54Changes")).toBeDefined();
    expect(docs.find((d) => d.slug === "cdm54")).toBeUndefined();
    expect(docs.find((d) => d.slug === "cdm53")).toBeUndefined();
    expect(docs.find((d) => d.slug === "cdm60")).toBeUndefined();
  });

  it("blacklists cdmNN.Rmd filenames (CSV-mirror documents) case-insensitively", () => {
    expect(RMD_DOCUMENT_BLACKLIST.length).toBeGreaterThan(0);
    expect(isBlacklistedDocument("cdm54.Rmd")).toBe(true);
    expect(isBlacklistedDocument("cdm531.rmd")).toBe(true);
    expect(isBlacklistedDocument("CDM60.RMD")).toBe(true);
    expect(isBlacklistedDocument("cdm54Changes.rmd")).toBe(false);
    expect(isBlacklistedDocument("cdm54erd.Rmd")).toBe(false);
    expect(isBlacklistedDocument("cdmDecisionTree.Rmd")).toBe(false);
  });

  it("finds documents by slug case-insensitively and returns undefined for unknown or blacklisted slugs", () => {
    const doc = findDocumentBySlug("CDM54Changes");
    expect(doc?.slug).toBe("cdm54Changes");
    expect(findDocumentBySlug("does-not-exist")).toBeUndefined();
    // Blacklisted documents are not discoverable even by exact slug
    expect(findDocumentBySlug("cdm54")).toBeUndefined();
  });

  it("loads the raw body of a known document", () => {
    const doc = findDocumentBySlug("cdm54Changes")!;
    const body = loadDocumentBody(doc);
    expect(body.length).toBeGreaterThan(100);
    expect(body.startsWith("---")).toBe(true);
  });

  it("strips .Rmd/.rmd/.RMD from filenames to form slugs", () => {
    expect(slugOfRmd("cdm54.Rmd")).toBe("cdm54");
    expect(slugOfRmd("cdmRPackage.rmd")).toBe("cdmRPackage");
    expect(slugOfRmd("cdm54ToolingSupport.RMD")).toBe("cdm54ToolingSupport");
  });

  it("extracts frontmatter titles cleanly", () => {
    const sample = [
      "---",
      'title: "**OMOP CDM v5.4**"',
      "output: html_document",
      "---",
      "",
      "# Body heading",
      "",
    ].join("\n");
    expect(extractDocumentTitle(sample, "fallback")).toBe("OMOP CDM v5.4");
  });

  it("falls back to the first heading if frontmatter has no title", () => {
    const sample = "# First heading\n\nbody";
    expect(extractDocumentTitle(sample, "fallback")).toBe("First heading");
  });

  it("falls back to the provided slug if nothing useful is available", () => {
    expect(extractDocumentTitle("body with no heading", "my-slug")).toBe(
      "my-slug",
    );
  });
});
