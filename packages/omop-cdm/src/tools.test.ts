import { describe, expect, it } from "vitest";

import {
  UnknownDocumentError,
  UnknownTableError,
  UnknownVersionError,
  callListFields,
  callListTables,
  callReadDocument,
  renderListDocuments,
  resolveVersion,
} from "./tools.js";

describe("resolveVersion", () => {
  it("defaults to 5.4 when omitted", () => {
    expect(resolveVersion(undefined)).toBe("5.4");
  });

  it("accepts supported versions as-is", () => {
    expect(resolveVersion("5.3")).toBe("5.3");
    expect(resolveVersion("5.4")).toBe("5.4");
    expect(resolveVersion("6.0")).toBe("6.0");
  });

  it("throws UnknownVersionError for unsupported versions", () => {
    expect(() => resolveVersion("5.5")).toThrow(UnknownVersionError);
    expect(() => resolveVersion("")).toThrow(UnknownVersionError);
  });
});

describe("callListTables", () => {
  it("renders the default version (5.4) and marks it as default", () => {
    const out = callListTables({});
    expect(out).toContain("# OMOP CDM v5.4 — tables");
    expect(out).toContain("- version: 5.4 (default)");
    expect(out).toContain("| `person`");
    expect(out).toContain("| # | table | schema | required | description |");
  });

  it("renders a non-default version without the 'default' annotation", () => {
    const out = callListTables({ version: "5.3" });
    expect(out).toContain("# OMOP CDM v5.3 — tables");
    expect(out).toContain("- version: 5.3");
    expect(out).not.toContain("- version: 5.3 (default)");
  });

  it("supports 6.0 explicitly", () => {
    const out = callListTables({ version: "6.0" });
    expect(out).toContain("# OMOP CDM v6.0 — tables");
    expect(out).toContain("| `person`");
  });
});

describe("callListFields", () => {
  it("lists fields of a known table in the default version", () => {
    const out = callListFields({ table: "person" });
    expect(out).toContain("# OMOP CDM v5.4 — `person` fields");
    expect(out).toContain("| `person_id`");
    expect(out).toContain("| # | field | datatype | required | PK | FK target |");
    // person_id is the primary key — should have a ✓ somewhere on that row.
    expect(out).toMatch(/\|\s*`person_id`\s*\|[^\n]*\|\s*✓\s*\|/);
  });

  it("is case-insensitive on table name", () => {
    const out = callListFields({ table: "PERSON", version: "5.4" });
    expect(out).toContain("`person` fields");
  });

  it("renders foreign-key targets with domain when available", () => {
    const out = callListFields({ table: "person", version: "5.4" });
    expect(out).toMatch(/`gender_concept_id`[^\n]*CONCEPT.CONCEPT_ID \(Gender\)/);
  });

  it("throws UnknownTableError for a bogus table", () => {
    try {
      callListFields({ table: "nope" });
      throw new Error("expected UnknownTableError");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownTableError);
      expect((error as UnknownTableError).version).toBe("5.4");
      expect((error as UnknownTableError).message).toContain("person");
    }
  });

  it("throws UnknownVersionError for an unsupported version", () => {
    expect(() =>
      callListFields({ table: "person", version: "5.5" }),
    ).toThrow(UnknownVersionError);
  });
});

describe("document tools", () => {
  it("renders a markdown list of documents, excluding CSV-mirror cdmNN.Rmd files", () => {
    const out = renderListDocuments();
    expect(out).toContain("# OMOP CDM — R Markdown documents");
    expect(out).toContain("| # | slug | title | resource URI |");
    expect(out).toContain("| `cdm54Changes`");
    expect(out).toContain("`omop-cdm://document/cdm54Changes`");
    // CSV-mirror documents are filtered out of the list
    expect(out).not.toMatch(/\|\s*`cdm54`\s*\|/);
    expect(out).not.toMatch(/\|\s*`cdm53`\s*\|/);
    expect(out).not.toMatch(/\|\s*`cdm60`\s*\|/);
  });

  it("reads a document body with a metadata header", () => {
    const out = callReadDocument({ slug: "cdm54Changes" });
    expect(out).toContain("- slug: `cdm54Changes`");
    expect(out).toContain("- filename: `cdm54Changes.rmd`");
    expect(out).toContain("---");
  });

  it("throws UnknownDocumentError for an unknown slug", () => {
    expect(() => callReadDocument({ slug: "nope" })).toThrow(
      UnknownDocumentError,
    );
  });

  it("throws UnknownDocumentError for a blacklisted slug like cdm54", () => {
    expect(() => callReadDocument({ slug: "cdm54" })).toThrow(
      UnknownDocumentError,
    );
  });
});
